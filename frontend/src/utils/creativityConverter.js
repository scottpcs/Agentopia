// src/utils/creativityConverter.js

export function convertCreativityToModelSettings(creativity) {
    const { x, y } = creativity;
    
    const temperature = 0.3 + (x / 100) * 1.4; // Range: 0.3 to 1.7
    const maxTokens = 50 + Math.round((y / 100) * 950); // Range: 50 to 1000
    const topP = 0.1 + (x / 100) * 0.8; // Range: 0.1 to 0.9
    const frequencyPenalty = (100 - y) / 100; // Range: 0 to 1
    
    return {
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
    };
  }
  
  export function generateCustomInstructions(creativity) {
    const { x, y } = creativity;
    
    let instructions = "You are an AI assistant with ";
    
    if (x < 33) {
      instructions += "a focus on providing grounded, practical responses. Stick to well-established facts and conventional approaches. ";
    } else if (x < 66) {
      instructions += "a balance between practical knowledge and creative thinking. Feel free to suggest both conventional and novel ideas when appropriate. ";
    } else {
      instructions += "a highly imaginative and innovative mindset. Don't hesitate to think outside the box and provide unique perspectives or solutions. ";
    }
    
    if (y < 33) {
      instructions += "Your communication style is reserved and concise. Provide brief, to-the-point responses. ";
    } else if (y < 66) {
      instructions += "Your communication style is balanced. Provide detailed explanations when necessary, but also be concise when appropriate. ";
    } else {
      instructions += "Your communication style is effusive and detailed. Provide comprehensive explanations and don't hesitate to elaborate on topics. ";
    }
    
    instructions += "Adjust your responses according to the user's queries and the context of the conversation.";
    
    return instructions;
  }