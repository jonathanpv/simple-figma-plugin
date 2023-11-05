// @ts-nocheck
// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 500, height: 700 });

// ts-ignore() 
// Function to fetch data from the dummy API and store it in a string


// Call the function to fetch data




function generateTempIcon(node: SceneNode) {
  let svg = `<svg height="${node.height}" width="${node.width}">
  <ellipse cx="${node.width / 2}" cy="${node.height / 2}" rx="${(node.width / 2.4)}" ry="${(node.height / 2.4)}" style="fill:yellow;stroke:purple;stroke-width:2" />
 </svg>`
return svg;
}

function getPadding(node: SceneNode) {
  return `${node.paddingTop}px ${node.paddingRight}px ${node.paddingBottom}px ${node.paddingLeft}px`;
}

function removePaddingFromGeneratedCSSAndUseCorrectVars(node: SceneNode, cssObject) {
  let hasPadding = false;
  for (const key in cssObject) {
    // If the key includes the word 'padding', delete it from the object
    if (key.includes('padding')) {
      hasPadding = true;
      delete cssObject[key];
    }
  }
  if (hasPadding) {
    cssObject["padding"] = getPadding(node);
  }
  return cssObject;
}

async function getNodeCSS(node: SceneNode, selector) {
  let cssString = '';
  // const css = await node.getCSSAsync().then((res) => {
  //   return JSON.stringify(res, null, 2);
  // });

  // // Construct the CSS string for the node
  // cssString += `#${selector} {\n${css}\n}\n\n`;
  
  if (node.children && node.children.length > 0) {
    for (let i = 0; i < node.children.length; i++) {
      let child = node.children[i];
      const css = await child.getCSSAsync().then((res) => {
        removePaddingFromGeneratedCSSAndUseCorrectVars(child, res);
        let resString = JSON.stringify(res, null, 2).split("");
        resString[0] = '';
        resString[resString.length - 1] = '';
        return resString.join("");
      });

      if (child.name.includes("Icon")) {
      cssString += `\n// in the figma file this is called: ${child.name}\n`
      cssString += `only include the icon, heres the svg: \n`;
      const svgText = await child.exportAsync({format: "SVG_STRING"});
      const svg = generateTempIcon(child);
      cssString += `#${selector}:nth-child(${i + 1}) {\n ${svg}\n}\n\n`;
      } else {
        cssString += `\n// in the figma file this is called: ${child.name}\n`
      cssString += `#${selector}:nth-child(${i + 1}) {\n ${css}\n}\n\n`;
      }
      
    };
  }

  return cssString;
}

async function processNode(node, selectorPrefix = '', name='') {
  let cssString = '';
  const nodeName = selectorPrefix + name;
  
  cssString += await getNodeCSS(node, nodeName);
  
  // Recursively process child nodes
  if (node.children && node.children.length > 0) {
    for (let i = 0; i < node.children.length; i++) {
      // we want the name to always be in child notation, so the only css name we have is the parent one
      // rest of definitions are okay to be <parentSelector>:nth-child(1):nth-child(n) and so forth
      let name = `${nodeName}:nth-child(${i + 1})`;
      
      cssString += await processNode(node.children[i], `${name}`);
    }
  }

  return cssString;
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async msg => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  
  const selection = figma.currentPage.selection;
  let cssString: string = "";


  if (msg.type === 'generate-layout-instructions') {
    for (const node of figma.currentPage.selection) {

      if (selection.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'No nodes selected.' });
        return;
      }
  
      for (const node of selection) {
        await node.getDevResourcesAsync().then((res) => {console.log(res)});
        console.log(getPadding(node));
        cssString += `#${node.name.replace(/\s/g, '')} `
        cssString += await node.getCSSAsync().then((res) => {removePaddingFromGeneratedCSSAndUseCorrectVars(node, res); return JSON.stringify(res, null, 2)}) + '\n';
        cssString += await processNode(node, '', node.name.replace(/\s/g, ''));
      }
    }

    figma.ui.postMessage({
      type: 'set-instructions',
      instructions: cssString
    });

    fetch('https://jsonplaceholder.typicode.com/posts/1')
      .then(res => res.json())
      .then(data => {
        figma.ui.postMessage({
          type: 'set-openai',
          instructions: JSON.stringify(data)
        });
      });


  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  // figma.closePlugin();
};
