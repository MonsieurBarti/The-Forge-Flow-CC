export const rankCandidates = (patterns, options) => {
    const threshold = options.threshold ?? 0;
    const nowMs = new Date(options.now).getTime();
    const scored = patterns.map((p) => {
        const frequency = Math.min(Math.log2(p.count + 1) / 10, 1.0);
        const breadth = options.totalProjects > 0 ? p.projects / options.totalProjects : 0;
        const ageDays = (nowMs - new Date(p.lastSeen).getTime()) / (24 * 60 * 60 * 1000);
        const recency = Math.exp((-ageDays * Math.LN2) / 14);
        const consistency = options.totalSessions > 0 ? p.sessions / options.totalSessions : 0;
        const wF = options.weights?.frequency ?? 0.25;
        const wB = options.weights?.breadth ?? 0.3;
        const wR = options.weights?.recency ?? 0.25;
        const wC = options.weights?.consistency ?? 0.2;
        const score = frequency * wF + breadth * wB + recency * wR + consistency * wC;
        return {
            pattern: p.sequence,
            score: Math.round(score * 100) / 100,
            evidence: { count: p.count, sessions: p.sessions, projects: p.projects },
        };
    });
    return scored.filter((c) => c.score >= threshold).sort((a, b) => b.score - a.score);
};
//# sourceMappingURL=rank-candidates.js.map