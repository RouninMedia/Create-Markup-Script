function htmlToJavaScript(html, elementParent = 'document.body') {
  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id='__html_to_js__'>${html}</div>`, 'text/html');

  let elementCounter = 0;
  const lines = [];
  const isValidDatasetProperty = (property) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(property);

  function dataAttributeToDatasetProperty(attribute) {
    return attribute
      .slice(5)
      .split('-')
      .map((part, index) => ((index === 0) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');
  }

  function emitAttribute(element, attribute) {
    switch (true) {
      case (attribute.name === 'class'):
        const classes = attribute.value.match(/\S+/g) || [];
        classes.forEach((className) => lines.push(`${element}.classList.add(${JSON.stringify(className)});`));
      break;

      case (attribute.name === 'id'):
        lines.push(`${element}.id = ${JSON.stringify(attribute.value)};`);
      break;

      case (attribute.name.startsWith('data-')):
        const property = dataAttributeToDatasetProperty(attribute.name);
        (isValidDatasetProperty(property))
          ? lines.push(`${element}.dataset.${property} = ${JSON.stringify(attribute.value)};`)
          : lines.push(`${element}.setAttribute(${JSON.stringify(attribute.name)}, ${JSON.stringify(attribute.value)});`);
      break;

      default: lines.push(`${element}.setAttribute(${JSON.stringify(attribute.name)}, ${JSON.stringify(attribute.value)});`);
    }
  }

  function emitNode(node, elementParent) {
    switch (node.nodeType) {
      case (Node.ELEMENT_NODE):
        elementCounter++;
        const element = `el${elementCounter}`;
        lines.push(`const ${element} = document.createElement(${JSON.stringify(node.tagName.toLowerCase())});`);
        [...node.attributes].forEach((attribute) => emitAttribute(element, attribute));
        lines.push(`${elementParent}.appendChild(${element});`);
        [...node.childNodes].forEach((childNode) => emitNode(childNode, element));
      break;

      case (Node.TEXT_NODE):
        if (node.nodeValue !== '') {
          lines.push(`${elementParent}.appendChild(document.createTextNode(${JSON.stringify(node.nodeValue)}));`);
        }
      break;

      case (Node.COMMENT_NODE):
        lines.push(`${elementParent}.appendChild(document.createComment(${JSON.stringify(node.nodeValue)}));`);
      break;
    }
  }

  document.body.childNodes.forEach((childNode) => emitNode(childNode, elementParent));
  return lines.join("\n").replaceAll('\"', '`');
}
