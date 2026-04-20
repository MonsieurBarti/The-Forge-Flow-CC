import { Node, type Project, type SourceFile } from "ts-morph";

const MUTATING_PREFIX =
	/^(create|update|insert|delete|transition|close|record|claim|save|stage|append|remove|set|rename)/;

export interface Violation {
	filePath: string;
	line: number;
	methodName: string;
	receiverType: string;
}

/**
 * Walk the given sourceFile globs in `project`; return every call to a
 * mutating method on a receiver whose type implements a `*Store` port,
 * unless the call is lexically inside a `withTransaction(...)` body.
 *
 * The helper is pure over the Project it receives: no filesystem access,
 * no mutation of the project state.
 */
export const findUnwrappedMutations = (project: Project, globs: string[]): Violation[] => {
	const sources: SourceFile[] = project
		.getSourceFiles()
		.filter((sf) => globs.some((g) => matchesGlob(sf.getFilePath(), g)));

	const violations: Violation[] = [];

	for (const sf of sources) {
		sf.forEachDescendant((node) => {
			if (!Node.isCallExpression(node)) return;

			const callee = node.getExpression();
			if (!Node.isPropertyAccessExpression(callee)) return;

			const methodName = callee.getName();
			if (!MUTATING_PREFIX.test(methodName)) return;

			const receiver = callee.getExpression();
			const receiverType = receiver.getType();
			const receiverTypeText = receiverType.getText();
			if (!/Store(?:$|[^a-zA-Z])/.test(receiverTypeText)) return;

			if (isInsideWithTransactionBody(node)) return;

			violations.push({
				filePath: sf.getFilePath(),
				line: node.getStartLineNumber(),
				methodName,
				receiverType: receiverTypeText,
			});
		});
	}

	return violations;
};

const isInsideWithTransactionBody = (node: Node): boolean => {
	let current: Node | undefined = node.getParent();
	while (current) {
		if (Node.isCallExpression(current)) {
			const expr = current.getExpression();
			const text = expr.getText();
			if (text === "withTransaction" || text.endsWith(".withTransaction")) {
				return true;
			}
		}
		current = current.getParent();
	}
	return false;
};

const matchesGlob = (filePath: string, glob: string): boolean => {
	// Minimal glob — only supports '**' and '*' and literal segments.
	// '**/' matches zero or more path segments (including none).
	const escaped = glob
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*\*\//g, "::DOUBLESTAR::")
		.replace(/\*\*/g, ".*")
		.replace(/\*/g, "[^/]*")
		.replace(/::DOUBLESTAR::/g, "(?:.+/)?");
	return new RegExp(`^${escaped}$`).test(filePath);
};
