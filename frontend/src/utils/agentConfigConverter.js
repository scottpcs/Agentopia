// src/utils/agentConfigConverter.js

/**
 * Converts personality traits to descriptive text
 * @param {Object} personality - Personality configuration object
 * @returns {String} - Descriptive text of personality traits
 */
const personalityToDescription = (personality) => {
    const traits = [];
  
    // Creativity
    if (personality.creativity < 33) {
      traits.push("You prioritize practical, proven solutions and conventional approaches");
    } else if (personality.creativity > 66) {
      traits.push("You often suggest innovative and creative approaches");
    } else {
      traits.push("You balance practical solutions with creative thinking");
    }
  
    // Tone
    if (personality.tone < 33) {
      traits.push("You maintain a formal and professional tone");
    } else if (personality.tone > 66) {
      traits.push("You communicate in a casual, approachable manner");
    } else {
      traits.push("You adapt your tone to the context while remaining professional");
    }
  
    // Empathy
    if (personality.empathy < 33) {
      traits.push("You focus primarily on logical analysis and objective reasoning");
    } else if (personality.empathy > 66) {
      traits.push("You show high emotional intelligence and consider human factors");
    } else {
      traits.push("You balance analytical thinking with emotional awareness");
    }
  
    // Assertiveness
    if (personality.assertiveness < 33) {
      traits.push("You present suggestions diplomatically and indirectly");
    } else if (personality.assertiveness > 66) {
      traits.push("You communicate directly and decisively");
    } else {
      traits.push("You balance diplomacy with directness");
    }
  
    // Humor
    if (personality.humor > 66) {
      traits.push("You occasionally use appropriate humor to engage");
    } else if (personality.humor < 33) {
      traits.push("You maintain a consistently serious and professional tone");
    }
  
    // Optimism
    if (personality.optimism < 33) {
      traits.push("You maintain a careful, measured outlook, acknowledging potential challenges");
    } else if (personality.optimism > 66) {
      traits.push("You maintain an optimistic, solution-focused perspective");
    } else {
      traits.push("You balance optimism with practical realism");
    }
  
    return traits.join(" ");
  };
  
  /**
   * Converts role configuration to role description
   * @param {Object} role - Role configuration object
   * @returns {String} - Role description
   */
  const roleToDescription = (role) => {
    const aspects = [];
  
    // Role type
    aspects.push(`You are acting as a ${role.type}${role.type === 'custom' ? `: ${role.customRole}` : ''}`);
  
    // Goal orientation
    if (role.goalOrientation < 33) {
      aspects.push("Your primary focus is on executing defined objectives efficiently");
    } else if (role.goalOrientation > 66) {
      aspects.push("You actively explore new possibilities while working towards objectives");
    } else {
      aspects.push("You balance execution with exploration of new possibilities");
    }
  
    // Contribution style
    if (role.contributionStyle < 33) {
      aspects.push("You excel at generating new ideas and solutions");
    } else if (role.contributionStyle > 66) {
      aspects.push("You excel at evaluating and refining existing ideas");
    } else {
      aspects.push("You balance generating new ideas with evaluating existing ones");
    }
  
    // Task emphasis
    if (role.taskEmphasis < 33) {
      aspects.push("You focus primarily on problem-solving");
    } else if (role.taskEmphasis > 66) {
      aspects.push("You focus primarily on planning and organization");
    } else {
      aspects.push("You balance problem-solving with planning");
    }
  
    // Domain scope
    if (role.domainScope < 33) {
      aspects.push("You maintain a focused approach within your specific domain");
    } else if (role.domainScope > 66) {
      aspects.push("You consider broad implications across multiple domains");
    } else {
      aspects.push("You balance domain-specific focus with broader considerations");
    }
  
    return aspects.join(". ");
  };
  
  /**
   * Converts expertise configuration to expertise description
   * @param {Object} expertise - Expertise configuration object
   * @returns {String} - Expertise description
   */
  const expertiseToDescription = (expertise) => {
    const aspects = [];
  
    // Expertise level
    aspects.push(`You operate at a ${expertise.level} level of expertise`);
  
    // Knowledge balance
    if (expertise.knowledgeBalance < 33) {
      aspects.push("You provide broad, high-level insights across multiple areas");
    } else if (expertise.knowledgeBalance > 66) {
      aspects.push("You provide deep, specialized knowledge in your core areas");
    } else {
      aspects.push("You balance broad knowledge with specialized insights");
    }
  
    // Skills
    if (expertise.selectedSkills.length > 0) {
      aspects.push(`Your core competencies include: ${expertise.selectedSkills.join(", ")}`);
    }
  
    // Certainty
    if (expertise.certainty < 33) {
      aspects.push("You express opinions with appropriate caveats and acknowledge uncertainties");
    } else if (expertise.certainty > 66) {
      aspects.push("You express opinions with confidence when supported by your expertise");
    } else {
      aspects.push("You balance confidence with appropriate caveats");
    }
  
    // Responsibility scope
    if (expertise.responsibilityScope < 33) {
      aspects.push("You primarily provide advice and recommendations");
    } else if (expertise.responsibilityScope > 66) {
      aspects.push("You provide definitive guidance within your area of expertise");
    } else {
      aspects.push("You balance advisory with decisive guidance");
    }
  
    return aspects.join(". ");
  };
  
  /**
   * Generates complete system prompt from agent configuration
   * @param {Object} config - Complete agent configuration
   * @returns {Object} - System prompt, model settings, and metadata
   */
  export function generateAgentConfiguration(config) {
    const roleDesc = roleToDescription(config.role);
    const personalityDesc = personalityToDescription(config.personality);
    const expertiseDesc = expertiseToDescription(config.expertise);
  
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
  
    const modelSettings = getModelSettings(config);
  
    return {
      systemPrompt,
      modelSettings,
      metadata: {
        role: config.role.type,
        expertiseLevel: config.expertise.level,
        skills: config.expertise.selectedSkills
      }
    };
  }
  
  /**
   * Converts agent configuration to model settings
   * @param {Object} config - Complete agent configuration
   * @returns {Object} - Model settings including temperature and presence_penalty
   */
  const getModelSettings = (config) => {
    // Base temperature on creativity and certainty
    const baseTemperature = (config.personality.creativity / 100) * 0.7; // Max 0.7 for creativity
    const certaintyCurve = ((100 - config.expertise.certainty) / 100) * 0.3; // Max 0.3 for uncertainty
    const temperature = Math.min(0.3 + baseTemperature + certaintyCurve, 1.0);
  
    // Presence penalty based on knowledge balance
    const presencePenalty = config.expertise.knowledgeBalance > 66 ? 0.1 : 0.3;
  
    // Frequency penalty based on creativity
    const frequencyPenalty = config.personality.creativity > 66 ? 0.3 : 0.1;
  
    return {
      temperature,
      presencePenalty,
      frequencyPenalty,
    };
  };
  
  export { personalityToDescription, roleToDescription, expertiseToDescription };