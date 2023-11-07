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


let initialSelection = [...figma.currentPage.selection];


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
  if (node.name.includes("Icon")) {
    cssString += `\n// in the figma file this is called: ${node.name}\n`
    cssString += `only include the icon, heres the svg: \n`;
    const svg = generateTempIcon(node);
    cssString += `#${selector} {\n ${svg}\n}\n\n`;
    return cssString;
  }
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

      if (!child.name.includes("Icon")) {
        cssString += `\n//// in the figma file this is called: ${child.name}\n`
        cssString += `#${selector}:nth-child(${i + 1}) {\n ${css}\n}\n\n`;
      }

    };
  }

  return cssString;
}

async function processNode(node, selectorPrefix = '', name = '') {
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

  if (msg.type === 'save-settings') {
    // Save the values to client storage
    await figma.clientStorage.setAsync('resourceName', msg.configData.resourceName);
    await figma.clientStorage.setAsync('deploymentName', msg.configData.deploymentName);
    await figma.clientStorage.setAsync('apiKey', msg.configData.apiKey);
  }

  if (msg.type === 'load-settings') {
    // Load the values from client storage
    const resourceName = await figma.clientStorage.getAsync('resourceName');
    const deploymentName = await figma.clientStorage.getAsync('deploymentName');
    const apiKey = await figma.clientStorage.getAsync('apiKey');

    // Send the values back to the UI
    figma.ui.postMessage({
      type: 'load-settings',
      configData: {
        resourceName,
        deploymentName,
        apiKey
      }
    });
  }

  const selection = figma.currentPage.selection;
  let cssString: string = "";


  if (msg.type === 'generate-layout-instructions') {
    for (const node of figma.currentPage.selection) {

      if (selection.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'No nodes selected.' });
        return;
      }

      for (const node of selection) {
        await node.getDevResourcesAsync().then((res) => { console.log(res) });
        console.log(getPadding(node));
        cssString += `#${node.name.replace(/\s/g, '')} `
        cssString += await node.getCSSAsync().then((res) => { removePaddingFromGeneratedCSSAndUseCorrectVars(node, res); return JSON.stringify(res, null, 2) }) + '\n';
        cssString += await processNode(node, '', node.name.replace(/\s/g, ''));
      }
    }

    figma.ui.postMessage({
      type: 'set-instructions',
      instructions: cssString
    });
  }

  if (msg.type === 'generate-ai') {
    // Define the parameters
    const resourceName = await figma.clientStorage.getAsync('resourceName');
    const deploymentName = await figma.clientStorage.getAsync('deploymentName');
    const apiKey = await figma.clientStorage.getAsync('apiKey');
    const apiVersion = '2023-07-01-preview';

    // Construct the URL using template literals
    const url = `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    // Define the data to be sent
    const data = {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Reply with hello world please :)" },
      ],
      temperature: 0.3,
      top_p: 0.3,
      max_tokens: 20000,
      stream: true
    };

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(data)
    }).then(response => {
      return response.text();
      // figma.ui.postMessage({
      //   type: 'set-openai',
      //   instructions: JSON.stringify(data.choices[0].message.content)
      // });
    }).then(text => {
      // Here we have the entire response body as text.
      // For an event stream, this is not ideal because we cannot process events as they arrive.
      console.log('Received text:', text);

      // If you were to manually process the event stream text, you would need to split
      // the text by the event stream's usual delimiter ("\n\n") and handle each event.
      const events = text.split('\n\n');
      for (let event of events) {
        // Further processing for each event...
        console.log('Event:', event);
      }
    })
      .catch((error) => {
        console.error('Error:', error);
      });

    // fetch('https://jsonplaceholder.typicode.com/posts/1')
    //   .then(res => res.json())
    //   .then(data => {

    //   });
  }


  if (msg.type === 'get-nodes') {
    const nodesData = await getNodes();
    figma.ui.postMessage({ type: 'nodes-data', data: nodesData });
  }
  if (msg.type === 'save-node-config') {
    for (const node of msg.nodes) {
      await figma.clientStorage.setAsync(node.node_id, node.node_instructions);
    }
    figma.ui.postMessage({ type: 'save-complete' });
  }
  if (msg.type === 'select-node') {
    const nodeToSelect = figma.getNodeById(msg.node_id);
    if (nodeToSelect) {
      figma.viewport.scrollAndZoomIntoView([nodeToSelect]);
      figma.currentPage.selection = [nodeToSelect];
    }
  }

  if (msg.type === 'get-node-instruction') {
    const instruction = await figma.clientStorage.getAsync(msg.node_id);
    figma.ui.postMessage({ type: 'node-instruction-data', data: { node_id: msg.node_id, instruction: instruction } });
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  // figma.closePlugin();
};


async function getNodes(): Promise<any[]> {
  const selectedNodes = figma.currentPage.selection;

  // Return an empty array if no nodes are selected
  if (selectedNodes.length === 0) {
    figma.notify('No nodes selected');
    return [];
  }

  // Helper function to recursively process nodes and their children
  async function processNode(node: SceneNode): Promise<any> {
    // Fetch instructions for the current node
    const instruction = await figma.clientStorage.getAsync(node.id) || '';

    // Base node data
    let nodeData = {
      id: node.id,
      name: node.name,
      instruction: instruction,
      children: []
    };

    // If the node has children, process each one and add to the node's children array
    if ('children' in node && node.children.length > 0) {
      for (const child of node.children) {
        const childData = await processNode(child);
        nodeData.children.push(childData); // Add child data to the parent node
      }
    }

    return nodeData;
  }

  // Process each selected node and its children
  let nodesData = [];
  for (const node of selectedNodes) {
    const nodeData = await processNode(node);
    nodesData.push(nodeData);
  }

  return nodesData;
}
