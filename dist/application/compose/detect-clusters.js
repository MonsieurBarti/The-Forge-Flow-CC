function jaccardDistance(a, b) {
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const union = new Set([...a, ...b]);
    if (union.size === 0)
        return 1;
    return 1 - intersection.size / union.size;
}
export function detectClusters(observations, opts = {}) {
    const minSessions = opts.minSessions ?? 3;
    const minPatterns = opts.minPatterns ?? 2;
    const maxDist = opts.maxJaccardDistance ?? 0.3;
    const sessionTools = new Map();
    for (const obs of observations) {
        if (!sessionTools.has(obs.session))
            sessionTools.set(obs.session, new Set());
        sessionTools.get(obs.session).add(obs.tool);
    }
    if (sessionTools.size < minSessions)
        return [];
    const allTools = [...new Set(observations.map((o) => o.tool))];
    const toolSessionSets = new Map();
    for (const [session, tools] of sessionTools) {
        for (const tool of tools) {
            if (!toolSessionSets.has(tool))
                toolSessionSets.set(tool, new Set());
            toolSessionSets.get(tool).add(session);
        }
    }
    // Build co-occurrence counts
    const coOccurrence = new Map();
    for (const ts of sessionTools.values()) {
        const tools = [...ts];
        for (let i = 0; i < tools.length; i++) {
            for (let j = i + 1; j < tools.length; j++) {
                const key = [tools[i], tools[j]].sort().join("|");
                coOccurrence.set(key, (coOccurrence.get(key) ?? 0) + 1);
            }
        }
    }
    // Greedy clustering by Jaccard distance
    const clusters = [];
    const visited = new Set();
    for (const tool of allTools) {
        if (visited.has(tool))
            continue;
        const cluster = new Set([tool]);
        visited.add(tool);
        for (const other of allTools) {
            if (visited.has(other))
                continue;
            const dist = jaccardDistance(toolSessionSets.get(tool), toolSessionSets.get(other));
            if (dist < maxDist) {
                cluster.add(other);
                visited.add(other);
            }
        }
        if (cluster.size >= minPatterns) {
            const clusterSessions = new Set();
            for (const t of cluster) {
                for (const s of toolSessionSets.get(t))
                    clusterSessions.add(s);
            }
            if (clusterSessions.size >= minSessions) {
                clusters.push({
                    tools: [...cluster].sort(),
                    sessions: clusterSessions.size,
                    activations: [...coOccurrence.entries()]
                        .filter(([key]) => {
                        const [a, b] = key.split("|");
                        return cluster.has(a) && cluster.has(b);
                    })
                        .reduce((sum, [, count]) => sum + count, 0),
                });
            }
        }
    }
    return clusters.sort((a, b) => b.activations - a.activations);
}
//# sourceMappingURL=detect-clusters.js.map