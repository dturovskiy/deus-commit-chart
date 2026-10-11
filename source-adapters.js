'use strict';

// Shared source boundary for the single-file CLI, batch publisher and composite Action.
// Every caller supplies one frozen asOf; all sources return the same envelope.
const { fetchGithubDailyCounts } = require('./contribution-snapshot');
const { readLocalGitDailyCounts } = require('./local-git-source');
const { createContributionSnapshot } = require('./contribution-snapshot-model');

async function loadContributionSource(settings, options = {}) {
  if (!settings || !['github', 'local'].includes(settings.source)) {
    throw new Error('Source must be github or local');
  }
  const asOf = new Date(options.asOf ?? new Date());
  if (!Number.isFinite(asOf.getTime())) throw new Error('Invalid source asOf timestamp');
  const raw = settings.source === 'github'
    ? await fetchGithubDailyCounts(settings.username, { ...options, asOf })
    : readLocalGitDailyCounts(
      settings.repo || '.', settings.branch || 'main', settings.author || '', asOf, options
    );
  return { ...raw, snapshot: createContributionSnapshot(raw) };
}

module.exports = { loadContributionSource, fetchGithubDailyCounts, readLocalGitDailyCounts };
