// src/utils/agentConfigConverter.js

/**
 * Default configuration values for new agents
 */
export const defaultAgentConfig = {
    personality: {
      creativity: 50,
      tone: 50,
      empathy: 50,
      assertiveness: 50,
      humor: 50,
      optimism: 50
    },
    role: {
      type: 'assistant',
      customRole: '',
      goalOrientation: 50,
      contributionStyle: 50,
      taskEmphasis: 50,
      domainScope: 50
    },
    expertise: {
      level: 'intermediate',
      knowledgeBalance: 50,
      selectedSkills: [],
      certainty: 50,
      responsibilityScope: 50
    }
  };
  
  /**
   * Converts personality traits to descriptive text
   */
  const personalityToDescription = (personality = defaultAgentConfig.personality) => {
    const traits = [];
    
    // Ensure personality object exists
    const safePersonality = { ...defaultAgentConfig.personality, ...personality };
  
    // Creativity
    if (safePersonality.creativity < 33) {
      traits.push("You prioritize practical, proven solutions and conventional approaches");
    } else if (safePersonality.creativity > 66) {
      traits.push("You often suggest innovative and creative approaches");
    } else {
      traits.push("You balance practical solutions with creative thinking");
    }
  
    // Tone
    if (safePersonality.tone < 33) {
      traits.push("You maintain a formal and professional tone");
    } else if (safePersonality.tone > 66) {
      traits.push("You communicate in a casual, approachable manner");
    } else {
      traits.push("You adapt your tone to the context while remaining professional");
    }
  
    // Empathy
    if (safePersonality.empathy < 33) {
      traits.push("You focus primarily on logical analysis and objective reasoning");
    } else if (safePersonality.empathy > 66) {
      traits.push("You show high emotional intelligence and consider human factors");
    } else {
      traits.push("You balance analytical thinking with emotional awareness");
    }
  
    // Assertiveness
    if (safePersonality.assertiveness < 33) {
      traits.push("You present suggestions diplomatically and indirectly");
    } else if (safePersonality.assertiveness > 66) {
      traits.push("You communicate directly and decisively");
    } else {
      traits.push("You balance diplomacy with directness");
    }
  
    // Humor
    if (safePersonality.humor > 66) {
      traits.push("You occasionally use appropriate humor to engage");
    } else if (safePersonality.humor < 33) {
      traits.push("You maintain a consistently serious and professional tone");
    }
  
    // Optimism
    if (safePersonality.optimism < 33) {
      traits.push("You maintain a careful, measured outlook, acknowledging potential challenges");
    } else if (safePersonality.optimism > 66) {
      traits.push("You maintain an optimistic, solution-focused perspective");
    } else {
      traits.push("You balance optimism with practical realism");
    }
  
    return traits.join(". ");
  };
  
  /**
   * Converts role configuration to role description
   */
  const roleToDescription = (role = defaultAgentConfig.role) => {
    const aspects = [];
    
    // Ensure role object exists
    const safeRole = { ...defaultAgentConfig.role, ...role };
  
    // Role type
    aspects.push(`You are acting as a ${safeRole.type}${safeRole.type === 'custom' ? `: ${safeRole.customRole}` : ''}`);
  
    // Goal orientation
    if (safeRole.goalOrientation < 33) {
      aspects.push("Your primary focus is on executing defined objectives efficiently");
    } else if (safeRole.goalOrientation > 66) {
      aspects.push("You actively explore new possibilities while working towards objectives");
    } else {
      aspects.push("You balance execution with exploration of new possibilities");
    }
  
    // Other role aspects...
    // [Previous role aspects code remains the same]
  
    return aspects.join(". ");
  };
  
  /**
   * Converts expertise configuration to expertise description
   */
  const expertiseToDescription = (expertise = defaultAgentConfig.expertise) => {
    const aspects = [];
    
    // Ensure expertise object exists
    const safeExpertise = { ...defaultAgentConfig.expertise, ...expertise };
  
    // Expertise level
    aspects.push(`You operate at a ${safeExpertise.level} level of expertise`);
  
    // Knowledge balance
    if (safeExpertise.knowledgeBalance < 33) {
      aspects.push("You provide broad, high-level insights across multiple areas");
    } else if (safeExpertise.knowledgeBalance > 66) {
      aspects.push("You provide deep, specialized knowledge in your core areas");
    } else {
      aspects.push("You balance broad knowledge with specialized insights");
    }
  
    // Skills
    if (safeExpertise.selectedSkills && safeExpertise.selectedSkills.length > 0) {
      aspects.push(`Your core competencies include: ${safeExpertise.selectedSkills.join(", ")}`);
    }
  
    // Other expertise aspects...
    // [Previous expertise aspects code remains the same]
  
    return aspects.join(". ");
  };
  
  /**
   * Generates complete system prompt from agent configuration
   */
  export function generateAgentConfiguration(config = {}) {
    // Ensure all required objects exist with defaults
    const safeConfig = {
      personality: { ...defaultAgentConfig.personality, ...config.personality },
      role: { ...defaultAgentConfig.role, ...config.role },
      expertise: { ...defaultAgentConfig.expertise, ...config.expertise }
    };
  
    const roleDesc = roleToDescription(safeConfig.role);
    const personalityDesc = personalityToDescription(safeConfig.personality);
    const expertiseDesc = expertiseToDescription(safeConfig.expertise);
  
    const systemPrompt = `${roleDesc}
  
  Your personality characteristics:
  ${personalityDesc}
  
  Your expertise profile:
  ${expertiseDesc}
  
  General guidelines:
  - Maintain consistency with your defined personality traits
  - Stay within your expertise level and domain focus
  - Express certainty in line with your confidence level
  - Format responses according to your knowledge depth
  - When providing information outside your core expertise, acknowledge the limitations of your knowledge`;
  
    const modelSettings = getModelSettings(safeConfig);
  
    return {
      systemPrompt,
      modelSettings,
      metadata: {
        role: safeConfig.role.type,
        expertiseLevel: safeConfig.expertise.level,
        skills: safeConfig.expertise.selectedSkills || []
      }
    };
  }
  
  /**
   * Converts agent configuration to model settings
   */
  const getModelSettings = (config) => {
    const safeConfig = {
      personality: { ...defaultAgentConfig.personality, ...config.personality },
      expertise: { ...defaultAgentConfig.expertise, ...config.expertise }
    };
  
    // Base temperature on creativity and certainty
    const baseTemperature = (safeConfig.personality.creativity / 100) * 0.7;
    const certaintyCurve = ((100 - safeConfig.expertise.certainty) / 100) * 0.3;
    const temperature = Math.min(0.3 + baseTemperature + certaintyCurve, 1.0);
  
    // Presence penalty based on knowledge balance
    const presencePenalty = safeConfig.expertise.knowledgeBalance > 66 ? 0.1 : 0.3;
  
    // Frequency penalty based on creativity
    const frequencyPenalty = safeConfig.personality.creativity > 66 ? 0.3 : 0.1;
  
    return {
      temperature,
      presencePenalty,
      frequencyPenalty,
    };
  }
  
  export { personalityToDescription, roleToDescription, expertiseToDescription };