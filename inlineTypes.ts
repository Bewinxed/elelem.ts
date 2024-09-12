import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const distPath = path.resolve('./dist');

function createProgram(filePath: string): ts.Program {
	const configPath = ts.findConfigFile(path.dirname(filePath), ts.sys.fileExists, 'tsconfig.json');
	const { config } = ts.readConfigFile(configPath!, ts.sys.readFile);
	const { options } = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath!));
	return ts.createProgram([filePath], options);
}

function findTypeDeclaration(sourceFile: ts.SourceFile, typeName: string): ts.Node | undefined {
	let result: ts.Node | undefined;

	function visit(node: ts.Node) {
		if (
			(ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
			node.name.text === typeName
		) {
			result = node;
			return;
		}
		ts.forEachChild(node, visit);
	}

	ts.forEachChild(sourceFile, visit);
	return result;
}

function inlineTypes(filePath: string) {
	const program = createProgram(filePath);
	const typeChecker = program.getTypeChecker();
	const sourceFile = program.getSourceFile(filePath)!;

	const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
		return (sourceFile) => {
			const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
				if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) {
					const namedBindings = node.importClause.namedBindings;
					if (namedBindings && ts.isNamedImports(namedBindings)) {
						const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
						const importedSourceFile = program.getSourceFile(
							require.resolve(importPath, { paths: [path.dirname(filePath)] })
						);

						if (!importedSourceFile) {
							return node; // Keep original import if we can't find the file
						}

						const inlinedDeclarations: ts.Statement[] = [];

						namedBindings.elements.forEach((element) => {
							const typeDeclaration = findTypeDeclaration(importedSourceFile, element.name.text);
							if (typeDeclaration) {
								inlinedDeclarations.push(typeDeclaration as ts.Statement);
							}
						});

						return inlinedDeclarations;
					}
				}
				return ts.visitEachChild(node, visitor, context);
			};
			return ts.visitNode(sourceFile, visitor);
		};
	};

	const result = ts.transform(sourceFile, [transformer]);
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
	const transformedSourceFile = result.transformed[0];
	const output = printer.printFile(transformedSourceFile);

	fs.writeFileSync(filePath, output);
}

fs.readdirSync(distPath).forEach((file) => {
	if (file.endsWith('.d.ts')) {
		inlineTypes(path.join(distPath, file));
	}
});

console.log('Types have been inlined successfully.');
