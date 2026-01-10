import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface GetPaymentHistoryRequest {
  externalUserId: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: GetPaymentHistoryRequest = await req.json();
    const { 
      externalUserId, 
      page = 1, 
      pageSize = 10,
      startDate,
      endDate,
      status,
      minAmount,
      maxAmount
    } = body;

    if (!externalUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build base query for summary (unfiltered for overall stats)
    const { data: allRecords, error: summaryError } = await supabase
      .from('payment_records')
      .select('amount, status')
      .eq('external_user_id', externalUserId);

    if (summaryError) {
      console.error('Failed to fetch payment summary:', summaryError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch payment history' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate summary statistics (overall, not filtered)
    const overallTotalRecords = allRecords?.length || 0;
    const totalAmount = allRecords?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;
    const statusBreakdown: Record<string, { count: number; amount: number }> = {};
    
    allRecords?.forEach((record) => {
      if (!statusBreakdown[record.status]) {
        statusBreakdown[record.status] = { count: 0, amount: 0 };
      }
      statusBreakdown[record.status].count += 1;
      statusBreakdown[record.status].amount += Number(record.amount);
    });

    // Build filtered query for count
    let countQuery = supabase
      .from('payment_records')
      .select('*', { count: 'exact', head: true })
      .eq('external_user_id', externalUserId);

    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate);
    }
    if (endDate) {
      // Add one day to include the end date fully
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      countQuery = countQuery.lt('created_at', endDateObj.toISOString());
    }
    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }
    if (minAmount !== undefined && minAmount !== null) {
      countQuery = countQuery.gte('amount', minAmount);
    }
    if (maxAmount !== undefined && maxAmount !== null) {
      countQuery = countQuery.lte('amount', maxAmount);
    }

    const { count: filteredCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Failed to count filtered records:', countError);
    }

    const totalRecords = filteredCount || 0;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const offset = (page - 1) * pageSize;

    // Build filtered query for data
    let dataQuery = supabase
      .from('payment_records')
      .select('id, payment_id, amount, memo, status, txid, created_at')
      .eq('external_user_id', externalUserId);

    if (startDate) {
      dataQuery = dataQuery.gte('created_at', startDate);
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      dataQuery = dataQuery.lt('created_at', endDateObj.toISOString());
    }
    if (status && status !== 'all') {
      dataQuery = dataQuery.eq('status', status);
    }
    if (minAmount !== undefined && minAmount !== null) {
      dataQuery = dataQuery.gte('amount', minAmount);
    }
    if (maxAmount !== undefined && maxAmount !== null) {
      dataQuery = dataQuery.lte('amount', maxAmount);
    }

    const { data, error } = await dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Failed to fetch payment history:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch payment history' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error) {
      console.error('Failed to fetch payment history:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch payment history' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data || [],
        pagination: {
          page,
          pageSize,
          totalRecords,
          totalPages,
        },
        summary: {
          totalPayments: overallTotalRecords,
          totalAmount,
          statusBreakdown,
        },
        filteredCount: totalRecords,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment history error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
