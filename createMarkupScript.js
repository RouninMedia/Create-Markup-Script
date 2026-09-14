// FUNCTION :: GET MARKUP STRING
function getMarkupString (markup) {
  return markup
    .trim()
    .replace(/[\s]+/g, '␠')
    .replaceAll(/\>/g, '>^')
    .replaceAll(/\</g, '^<')
    .replaceAll(/\^␠?\^/g, '^');
}


// FUNCTION :: GET MARKUP ARRAY
function getMarkupArray (markupString) {
  return markupString
    .split('^')
    .filter((markupElement) => markupElement !== '')
    .map((markupElement) => markupElement = markupElement.replaceAll('␠', ' '));
}


// FUNCTION :: GET PARENT ELEMENT
function getParentElement (markupModel, indentLevel) {
  parentElement = markupModel;
  if (indentLevel > 0) {
    let i = 0;
    while (i < indentLevel) {
      parentElement = parentElement.findLast((element) => element.indentLevel === i);
      parentElement = parentElement.childElements; 
      i++;
    }
  }
  return parentElement;
}


// FUNCTION :: GET MARKUP MODEL
function getMarkupModel (markupArray) {
  let indentLevel = -1;
  const markupModel = [];

  markupArray.forEach((markupElement) => {
    switch (true) {

      // ELEMENT CLOSES
      case (markupElement.startsWith('</')):
        indentLevel--; 
      break;
        
      // ELEMENT OPENS
      case (markupElement.startsWith('<')):
        indentLevel++;
      
        // EXTRACT ELEMENT COMPONENTS
        let elementComponents = markupElement.replace('<', '').replace('>', '').split(' ');
        for (let i = (elementComponents.length - 1); (i + 1) > 0; i--) {
          if ((elementComponents[i].endsWith('"')) && (!elementComponents[i].includes('='))) {
            elementComponents[(i - 1)] += ` ${elementComponents[i]}`;
            elementComponents[i] = '';
          }
        }

        const element = {indentLevel};

        elementComponents = elementComponents.filter((markupElement) => markupElement !== '');

        elementComponents.forEach((elementComponent, i) => {

          switch (true) {
            case (i === 0):
              element['elementType'] = elementComponent;
            break;

            case (elementComponent.startsWith('class=')):
              element['classList'] = elementComponent
                .replace('class="', '')
                .replace('"', '')
                .split(' ');
            break;
              
            case (elementComponent.startsWith('data-')):
              if (!Object.hasOwn(element, 'dataSet')) {
                element['dataSet'] = {};
              }
              let [dataSetKey, dataSetValue] = elementComponent.split('=');
              dataSetKey = dataSetKey
                .replace('data-', '')
                .split('-')
                .map((segment, i) => (i === 0)
                  ? segment
                  : segment.at(0).toUpperCase() + segment.slice(1))
                .join('');
              element.dataSet[dataSetKey] = dataSetValue.replaceAll('"', '');
            break; 
              
            case (elementComponent.includes('=')):
              if (!Object.hasOwn(element, 'attributes')) {
                element['attributes'] = {};
              }
              let [attributeKey, attributeValue] = elementComponent.split('=');
              element.attributes[attributeKey] = attributeValue.replaceAll('"', '');
            break;

            case (elementComponent !== '/'):
              if (!Object.hasOwn(element, 'attributes')) {
                element['attributes'] = {};
              }
              element.attributes[elementComponent] = elementComponent;
              break;
          }

          element['childElements'] = [];
        });

        let elementParent = getParentElement(markupModel, indentLevel);
        elementParent.push(element);

        if (markupElement.endsWith('/>')) {
          indentLevel--; 
        }
      break;

      // TEXT NODES
      case (!markupElement.startsWith('<')):
        indentLevel++;
        let textNodeParent = getParentElement(markupModel, indentLevel);
        textNodeParent.push({elementType: 'textNode', textContent: markupElement});
        indentLevel--;
      break;
    }
  });

  return markupModel;
}


// FUNCTION :: GET MARKUP SCRIPT
let markupScript = '';
let elementTypeIndexes = {};
let elementTypeIndex;
let indent = ' '.repeat(2);
let indentIndex = 0;
let parentNodes = [];

function getMarkupScript (markupModel) {

  markupModel.forEach((element) => {

    // SET ELEMENT TYPE INDEX
    if (!Object.hasOwn(elementTypeIndexes, element.elementType)) {
      elementTypeIndexes[element.elementType] = 0;
    } else {
      elementTypeIndexes[element.elementType]++;
    }

    elementTypeIndex = elementTypeIndexes[element.elementType];

    const elementName = `${element.elementType}_${elementTypeIndex}`;

    if (element.elementType === 'textNode') {
      markupScript += indent.repeat(indentIndex);
      markupScript += `const ${elementName} = document.createTextNode('${element.textContent}');\n`;
      markupScript += indent.repeat(indentIndex);
      markupScript += `${parentNodes.at(-1)}.appendChild(${elementName});\n\n`;
    } else {
      markupScript += indent.repeat(indentIndex);
      markupScript += `const ${elementName} = document.createElement('${element.elementType}');\n`;

      if (Object.hasOwn(element, 'classList')) {
        element.classList.forEach((className) => {
          markupScript += indent.repeat(indentIndex);
          markupScript += `${elementName}.classList.add('${className}');\n`;
        });
      }

      if (Object.hasOwn(element, 'attributes')) {
        Object.entries(element.attributes).forEach((attributeEntry) => {
          markupScript += indent.repeat(indentIndex);
          markupScript += `${elementName}.setAttribute('${attributeEntry[0]}', '${attributeEntry[1]}');\n`;
        });
      }

      if (Object.hasOwn(element, 'dataSet')) {
        Object.entries(element.dataSet).forEach((dataSetEntry) => {
          markupScript += indent.repeat(indentIndex);
          markupScript += `${elementName}.dataset.${dataSetEntry[0]} = '${dataSetEntry[1]}';\n`;
        });
      }

      if ((Object.hasOwn(element, 'childElements')) && (element.childElements.length > 0)) {
        parentNodes.push(elementName);
        indentIndex++;
        markupScript += `\n`;
        getMarkupScript(element.childElements);
        parentNodes.pop(elementName);
        indentIndex--;
      }

      if (indentIndex > 0) {
        markupScript += indent.repeat(indentIndex);
        markupScript += `${parentNodes.at(-1)}.appendChild(${elementName});\n\n`;
      } else {
        markupScript += indent.repeat(indentIndex);
        markupScript += `document.body.appendChild(${elementName});\n\n\n`;
      }
    }
  });

  return markupScript;
}

function createMarkupScript (markup) {
  // LOG MARKUP
  console.log(markup);

  // GET MARKUP STRING FROM MARKUP
  let markupString = getMarkupString(markup);
  // console.log(' ');
  // console.log('markupString: ', markupString);

  // GET MARKUP ARRAY FROM MARKUP STRING
  let markupArray = getMarkupArray(markupString);
  // console.log(' ');
  // console.log('markupArray: ', markupArray);
 
  // GET MARKUP MODEL FROM MARKUP ARRAY
  let markupModel = getMarkupModel(markupArray);
  // console.log(' ');
  // console.log('markupModel: ', JSON.stringify(markupModel, null, 2));

  // GET MARKUP SCRIPT FROM MARKUP MODEL
  const markupScript = getMarkupScript(markupModel);
  console.log(' ');
  console.log(markupScript);
}


// MARKUP
let markup = `
  <header class="header">
    <h1 class="pageHeading">My Main Heading</h1>
    <img class="pageLogo" src="/path/to/page-logo.png" />
  </header>

  <main class="main">  
   <h2 class="mainHeading">My Subheading</h2>
   <p class="mainParagraph">This is a paragraph.</p>
   <p class="mainParagraph">This is <em class="emphasisedText">another</em> paragraph.</p>
   <p class="mainParagraph">This is <em class="emphasisedText"><b class="boldText">a third</b></em> paragraph.</p>
   <p class="mainParagraph" hidden>This is a hidden fourth paragraph.</p>
  </main>


  <footer id="footer" class="footer">
    <nav class="footerNav">
      <ul class="footerButtonList">
        <li class="footerButtonListItem"><button class="footerButton --about" type="button" data-lock-setting="unlocked">About</button></li>
        <li class="footerButtonListItem"><button class="footerButton --demos" type="button" data-lock-setting="locked" disabled>Demos</button></li>
        <li class="footerButtonListItem"><button class="footerButton --credits" type="button" data-lock-setting="unlocked">Credits</button></li>
      </ul>
    </nav> 
  </footer>
`;

// RUN SCRIPT
createMarkupScript(markup);
