'use strict';

// Pure daily aggregate metrics. Used by the data series builder and by both
// static SVG and browser renderer; verifier independently recomputes values.
function trailingMean7(counts) {
  if (!Array.isArray(counts) || !counts.length || counts.length > 7 ||
      counts.some(x => !Number.isSafeInteger(x) || x < 0)) {
    throw new Error('7-day mean requires one to seven safe nonnegative daily counts');
  }
  const sum = counts.reduce((acc,x) => acc+x,0);
  if (!Number.isSafeInteger(sum)) throw new Error('Unsafe rolling activity total');
  return Number((sum/counts.length).toFixed(2));
}

function dailyTotals(points) {
  if (!Array.isArray(points)) throw new Error('Daily totals expect data points');
  let total=0,activeDays=0;
  for(const point of points) {
    const count=Number(point?.commits);
    if(!Number.isSafeInteger(count)||count<0) throw new Error('Invalid daily activity count');
    total+=count;
    if(!Number.isSafeInteger(total)) throw new Error('Unsafe activity total');
    if(count>0)activeDays++;
  }
  return { total, activeDays };
}

module.exports={ trailingMean7, dailyTotals };
