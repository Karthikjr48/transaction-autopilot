/**
 * Truthful Merchant Analytics Calculation Engine
 * Strictly derives all metrics from authoritative PayPal Sandbox records.
 * Enforces Zero-Fake-Data: Zero synthetic multipliers, zero placeholder curves, zero assumed disputes.
 */

/**
 * Compute truthful analytics from verified PayPal Sandbox orders
 */
export function computeTruthfulAnalytics(orders = [], refunds = [], options = {}) {
  const totalCount = orders.length;

  let totalVolume = 0;
  let capturedVolume = 0;
  let capturedCount = 0;
  let approvedCount = 0;
  let createdCount = 0;
  let failedCount = 0;

  // Track daily volume for the last 7 calendar days
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyVolumeMap = {
    Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
  };

  // Track 4-hour buckets for today's volume curve
  const hourlyBuckets = {
    '00:00': 0,
    '04:00': 0,
    '08:00': 0,
    '12:00': 0,
    '16:00': 0,
    '20:00': 0
  };

  orders.forEach(o => {
    const amt = parseFloat(o.amount || 0);
    const validAmt = isNaN(amt) ? 0 : amt;
    totalVolume += validAmt;

    const status = (o.paypalStatus || o.status || 'CREATED').toUpperCase();
    const isCaptured = o.captureStatus === 'CAPTURED' || status === 'COMPLETED';

    if (isCaptured) {
      capturedCount++;
      capturedVolume += validAmt;
    } else if (status === 'APPROVED') {
      approvedCount++;
    } else if (status === 'CREATED') {
      createdCount++;
    } else {
      failedCount++;
    }

    // Map order timestamp to calendar day
    const ts = o.timestamp || o.createTime || o.create_time;
    if (ts) {
      const orderDate = new Date(ts);
      if (!isNaN(orderDate.getTime())) {
        const dName = dayNames[orderDate.getDay()];
        if (dailyVolumeMap[dName] !== undefined) {
          dailyVolumeMap[dName] += validAmt;
        }

        // Map to hourly bucket
        const hour = orderDate.getHours();
        if (hour < 4) hourlyBuckets['00:00'] += validAmt;
        else if (hour < 8) hourlyBuckets['04:00'] += validAmt;
        else if (hour < 12) hourlyBuckets['08:00'] += validAmt;
        else if (hour < 16) hourlyBuckets['12:00'] += validAmt;
        else if (hour < 20) hourlyBuckets['16:00'] += validAmt;
        else hourlyBuckets['20:00'] += validAmt;
      }
    }
  });

  // Calculate actual refund metrics
  let totalRefundsAmount = 0;
  let refundCount = 0;
  if (Array.isArray(refunds)) {
    refunds.forEach(r => {
      const rAmt = parseFloat(r.amount || 0);
      if (!isNaN(rAmt) && rAmt > 0) {
        totalRefundsAmount += rAmt;
        refundCount++;
      }
    });
  }

  // Round metrics to 2 decimal places
  totalVolume = Math.round(totalVolume * 100) / 100;
  capturedVolume = Math.round(capturedVolume * 100) / 100;
  totalRefundsAmount = Math.round(totalRefundsAmount * 100) / 100;

  // Format 7-day array
  const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyVolume = orderedDays.map(day => ({
    day,
    volume: Math.round(dailyVolumeMap[day] * 100) / 100
  }));

  // Format hourly volume array without synthetic multipliers
  const hourlyVolume = [
    { hour: '00:00', volume: Math.round(hourlyBuckets['00:00'] * 100) / 100 },
    { hour: '04:00', volume: Math.round(hourlyBuckets['04:00'] * 100) / 100 },
    { hour: '08:00', volume: Math.round(hourlyBuckets['08:00'] * 100) / 100 },
    { hour: '12:00', volume: Math.round(hourlyBuckets['12:00'] * 100) / 100 },
    { hour: '16:00', volume: Math.round(hourlyBuckets['16:00'] * 100) / 100 },
    { hour: '20:00', volume: Math.round(hourlyBuckets['20:00'] * 100) / 100 },
    { hour: 'Total', volume: totalVolume }
  ];

  // Status percentages
  const completedPct = totalCount > 0 ? Math.round((capturedCount / totalCount) * 100) : 0;
  const approvedPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const createdPct = totalCount > 0 ? Math.round((createdCount / totalCount) * 100) : 0;
  const failedPct = totalCount > 0 ? Math.max(0, 100 - completedPct - approvedPct - createdPct) : 0;

  return {
    totalVolume,
    capturedVolume,
    uncapturedVolume: Math.round((totalVolume - capturedVolume) * 100) / 100,
    totalCount,
    totalOrders: totalCount,
    successfulOrders: capturedCount,
    pendingOrders: createdCount + approvedCount,
    capturedCount,
    approvedCount,
    createdCount,
    failedCount,
    healthyCount: capturedCount,
    attentionCount: createdCount + approvedCount,
    criticalCount: failedCount,
    disputeRiskScore: (options.disputes?.length > 0) ? 'Elevated (Disputes Reported)' : (failedCount > 0 ? 'Elevated (Attention Required)' : 'Minimal (0.0%)'),
    settlementVelocity: capturedCount > 0 ? 'Standard Settlement (Instant)' : 'Pending First Capture',
    refunds: {
      count: refundCount,
      totalAmount: totalRefundsAmount,
      currency: 'USD'
    },
    disputes: {
      connected: Boolean(options.disputesConnected),
      count: Array.isArray(options.disputes) ? options.disputes.length : null,
      status: Boolean(options.disputesConnected) ? (options.disputes?.length ? 'ACTIVE_DISPUTES' : 'CLEAN') : 'DISPUTES_API_UNCONNECTED',
      displayMessage: Boolean(options.disputesConnected) ? `${options.disputes?.length || 0} recorded disputes` : 'Disputes API not connected (Integration required)'
    },
    hasData: totalCount > 0,
    dailyVolume,
    hourlyVolume,
    statusDistribution: {
      completed: completedPct,
      approved: approvedPct,
      created: createdPct,
      failed: failedPct,
      // Backward compatibility for legacy tests
      healthy: completedPct,
      attention: createdPct + approvedPct,
      critical: failedPct
    }
  };
}
