module.exports = function (node) {
	return (
		node.type === 'SubExpression' ||
		((node.type === 'MustacheStatement' || node.type === 'BlockStatement') &&
			!!((node.params && node.params.length) || node.hash))
	);
};
