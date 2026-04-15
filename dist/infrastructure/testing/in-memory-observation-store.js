import { Ok } from "../../domain/result.js";
export class InMemoryObservationStore {
    observations = [];
    patterns = [];
    candidates = [];
    async appendObservation(obs) {
        this.observations.push(obs);
        return Ok(undefined);
    }
    async readObservations() {
        return Ok([...this.observations]);
    }
    async writePatterns(patterns) {
        this.patterns = patterns;
        return Ok(undefined);
    }
    async readPatterns() {
        return Ok([...this.patterns]);
    }
    async writeCandidates(candidates) {
        this.candidates = candidates;
        return Ok(undefined);
    }
    async readCandidates() {
        return Ok([...this.candidates]);
    }
    reset() {
        this.observations = [];
        this.patterns = [];
        this.candidates = [];
    }
}
//# sourceMappingURL=in-memory-observation-store.js.map