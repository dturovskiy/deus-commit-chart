'use strict';

// Shared source boundary for the single-file CLI, batch publisher and composite Action.
// Every caller supplies one frozen asOf; all sources return the same envelope.
const { fetchGithubDailyCounts } = require('./contribution-snapshot');
const { readLocalGitDailyCounts } = require('./local-git-source');

async function loadContributionSource(settings, options = {}) {
  if (!settings || !['github', 'local'].includes(settings.source)) {
    throw new Error('Source must be github or local');
  }
  const asOf = new Date(options.asOf ?? new Date());
  if (!Number.isFinite(asOf.getTime())) throw new Error('Invalid source asOf timestamp');
  if (settings.source === 'github') {
    return fetchGithubDailyCounts(settings.username, { ...options, asOf });
  }
  return readLocalGitDailyCounts(
    settings.repo || '.', settings.branch || 'main', settings.author || '', asOf, options
  );
}

module.exports = { loadContributionSource, fetchGithubDailyCounts, readLocalGitDailyCounts };
