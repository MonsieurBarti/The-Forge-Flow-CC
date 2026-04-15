import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Ok } from "../../../domain/result.js";
export class JsonlStoreAdapter {
    sessionsPath;
    patternsPath;
    candidatesPath;
    constructor(basePath) {
        this.sessionsPath = join(basePath, "sessions.jsonl");
        this.patternsPath = join(basePath, "patterns.jsonl");
        this.candidatesPath = join(basePath, "candidates.jsonl");
    }
    async appendObservation(obs) {
        await mkdir(join(this.sessionsPath, ".."), { recursive: true });
        await appendFile(this.sessionsPath, `${JSON.stringify(obs)}\n`);
        return Ok(undefined);
    }
    async readObservations() {
        return this.readJsonl(this.sessionsPath);
    }
    async writePatterns(patterns) {
        return this.writeJsonl(this.patternsPath, patterns);
    }
    async readPatterns() {
        return this.readJsonl(this.patternsPath);
    }
    async writeCandidates(candidates) {
        return this.writeJsonl(this.candidatesPath, candidates);
    }
    async readCandidates() {
        return this.readJsonl(this.candidatesPath);
    }
    async readJsonl(path) {
        try {
            const content = await readFile(path, "utf-8");
            const lines = content
                .trim()
                .split("\n")
                .filter((l) => l.length > 0);
            return Ok(lines.map((l) => JSON.parse(l)));
        }
        catch {
            return Ok([]);
        }
    }
    async writeJsonl(path, items) {
        await mkdir(join(path, ".."), { recursive: true });
        const content = `${items.map((i) => JSON.stringify(i)).join("\n")}\n`;
        await writeFile(path, content);
        return Ok(undefined);
    }
}
//# sourceMappingURL=jsonl-store.adapter.js.map