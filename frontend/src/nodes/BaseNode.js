// src/nodes/BaseNode.js

class BaseNode {
    constructor(id, type, data = {}) {
      this.id = id;
      this.type = type;
      this.data = data;
      this.inputs = [];
      this.outputs = [];
    }
  
    addInput(inputName) {
      this.inputs.push(inputName);
    }
  
    addOutput(outputName) {
      this.outputs.push(outputName);
    }
  
    updateData(newData) {
      this.data = { ...this.data, ...newData };
    }
  
    // This method would be overridden by specific node types
    process(inputData) {
      throw new Error('Process method must be implemented by subclasses');
    }
  }
  
  export default BaseNode;