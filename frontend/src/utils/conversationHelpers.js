// src/utils/conversationHelpers.js

/**
 * Analyzes message content for various conversation elements
 */
export function analyzeMessage(content) {
    const analysis = {
      type: 'statement',
      mentions: [],
      questions: [],
      suggestions: [],
      topics: [],
      sentiment: 'neutral',
      urgency: 'normal',
      references: [],
      actionItems: [],
      agreements: [],
      disagreements: []
    };
  
    // Detect questions
    if (content.includes('?')) {
      analysis.type = 'question';
      analysis.questions = content
        .split(/[.!?]/)
        .filter(s => s.includes('?'))
        .map(q => q.trim());
    }
  
    // Detect mentions (names or roles preceded by @ or explicitly mentioned)
    const mentionRegex = /(?:@|mention|ask|address)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      analysis.mentions.push(match[1]);
    }
  
    // Detect suggestions
    if (/(?:suggest|propose|recommend|maybe we should|what if|we could)/i.test(content)) {
      analysis.type = 'suggestion';
      const suggestionRegex = /(?:suggest|propose|recommend|maybe we should|what if|we could)\s+([^.!?]+[.!?])/gi;
      while ((match = suggestionRegex.exec(content)) !== null) {
        analysis.suggestions.push(match[1].trim());
      }
    }
  
    // Detect topics using keyword analysis
    const topics = new Set();
    const topicIndicators = [
      'discuss', 'topic', 'regarding', 'about', 'concerning',
      'focus on', 'talk about', 'consider', 'address'
    ];
    
    content.toLowerCase().split(/[.,!?]/).forEach(sentence => {
      topicIndicators.forEach(indicator => {
        if (sentence.includes(indicator)) {
          const words = sentence.split(' ');
          const indicatorIndex = words.findIndex(w => w === indicator || w.endsWith(indicator));
          if (indicatorIndex >= 0 && words[indicatorIndex + 1]) {
            // Extract topic phrase (up to 3 words following the indicator)
            const topicPhrase = words
              .slice(indicatorIndex + 1, indicatorIndex + 4)
              .join(' ')
              .replace(/[^a-z0-9\s]/g, '')
              .trim();
            if (topicPhrase) topics.add(topicPhrase);
          }
        }
      });
    });
    analysis.topics = Array.from(topics);
  
    // Detect sentiment using comprehensive word lists and patterns
    const sentimentPatterns = {
      positive: [
        /(?:strong(?:ly)?|complete(?:ly)?|absolute(?:ly)?)\s+agree/i,
        /(?:good|great|excellent|awesome|wonderful|fantastic|brilliant)/i,
        /(?:like|love|appreciate|support|endorse|favor)/i,
        /(?:yes|definitely|absolutely|certainly|surely)/i
      ],
      negative: [
        /(?:strong(?:ly)?|complete(?:ly)?|absolute(?:ly)?)\s+disagree/i,
        /(?:bad|poor|terrible|awful|horrible|disappointing)/i,
        /(?:dislike|hate|reject|oppose|against)/i,
        /(?:no|never|wrong|incorrect|false)/i
      ],
      neutral: [
        /(?:think|believe|consider|suppose|assume|guess)/i,
        /(?:maybe|perhaps|possibly|probably|might|could)/i,
        /(?:sometimes|occasionally|depending|varies)/i
      ]
    };
  
    let sentimentScores = { positive: 0, negative: 0, neutral: 0 };
  
    // Check each pattern against the content
    Object.entries(sentimentPatterns).forEach(([sentiment, patterns]) => {
      patterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        sentimentScores[sentiment] += matches.length;
      });
    });
  
    // Determine overall sentiment
    const maxScore = Math.max(...Object.values(sentimentScores));
    if (maxScore > 0) {
      analysis.sentiment = Object.entries(sentimentScores)
        .find(([_, score]) => score === maxScore)[0];
    }
  
    // Detect urgency
    const urgencyPatterns = {
      high: [
        /(?:urgent|immediate(?:ly)?|asap|emergency|critical)/i,
        /(?:need|require|must)\s+(?:now|today|asap)/i,
        /(?:time-sensitive|pressing|crucial)/i
      ],
      low: [
        /(?:when\s+possible|no\s+rush|eventually|later|sometime)/i,
        /(?:can\s+wait|not\s+urgent|low\s+priority)/i
      ]
    };
  
    if (urgencyPatterns.high.some(pattern => pattern.test(content))) {
      analysis.urgency = 'high';
    } else if (urgencyPatterns.low.some(pattern => pattern.test(content))) {
      analysis.urgency = 'low';
    }
  
    // Detect references to previous messages or content
    const referencePatterns = [
      /(?:as\s+mentioned|referring\s+to|in\s+response\s+to)/i,
      /(?:earlier|previous(?:ly)?|before)\s+(?:point|message|comment)/i,
      /(?:to\s+add\s+to|building\s+on)\s+(?:what|that)/i
    ];
  
    referencePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        analysis.references.push({
          type: 'message',
          pattern: matches[0],
          context: content.substring(
            Math.max(0, matches.index - 20),
            Math.min(content.length, matches.index + matches[0].length + 20)
          )
        });
      }
    });
  
    // Detect action items
    const actionPatterns = [
      /(?:need\s+to|should|must|will)\s+([^.!?]+[.!?])/gi,
      /(?:action\s+item|task|todo|to-do):?\s+([^.!?]+[.!?])/gi,
      /(?:please|kindly)\s+([^.!?]+[.!?])/gi
    ];
  
    actionPatterns.forEach(pattern => {
      while ((match = pattern.exec(content)) !== null) {
        analysis.actionItems.push({
          action: match[1].trim(),
          assignee: getActionAssignee(match[1]),
          deadline: getActionDeadline(match[1])
        });
      }
    });
  
    // Detect agreements and disagreements
    const agreementPatterns = [
      /(?:agree|concur|same\s+here|exactly|precisely)/i,
      /(?:good|great|excellent)\s+point/i,
      /(?:you['']?re\s+right|that['']?s\s+right)/i
    ];
  
    const disagreementPatterns = [
      /(?:disagree|differ|not\s+quite|not\s+necessarily)/i,
      /(?:however|but|although|though|nonetheless)/i,
      /(?:on\s+the\s+contrary|actually|in\s+fact)/i
    ];
  
    agreementPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        analysis.agreements.push({
          type: 'agreement',
          context: content.match(pattern)[0]
        });
      }
    });
  
    disagreementPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        analysis.disagreements.push({
          type: 'disagreement',
          context: content.match(pattern)[0]
        });
      }
    });
  
    return analysis;
  }
  
  /**
   * Helper function to extract action assignees
   */
  function getActionAssignee(actionText) {
    const assigneePatterns = [
      /(?:@(\w+))/,                           // @mentions
      /(\w+)\s+(?:should|needs?\s+to|must)/,  // Name followed by action verb
      /(?:assign(?:ed)?\s+to)\s+(\w+)/        // Explicit assignment
    ];
  
    for (const pattern of assigneePatterns) {
      const match = actionText.match(pattern);
      if (match) return match[1];
    }
  
    return null;
  }
  
  /**
   * Helper function to extract action deadlines
   */
  function getActionDeadline(actionText) {
    const deadlinePatterns = [
      /by\s+(\w+(?:\s+\d{1,2}(?:st|nd|rd|th)?)?(?:\s*,?\s*\d{4})?)/i,
      /(?:due|deadline)(?:\s+(?:date|on|by))?\s+(\w+(?:\s+\d{1,2}(?:st|nd|rd|th)?)?(?:\s*,?\s*\d{4})?)/i,
      /(?:today|tomorrow|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday))/i
    ];
  
    for (const pattern of deadlinePatterns) {
      const match = actionText.match(pattern);
      if (match) return match[1] || match[0];
    }
  
    return null;
  }
  
  /**
   * Calculates message relevance to current topics
   */
  export function calculateTopicRelevance(message, activeTopics) {
    if (!activeTopics || activeTopics.size === 0) return 1;
  
    const messageWords = new Set(
      message.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
    );
  
    let relevanceScore = 0;
    activeTopics.forEach(topic => {
      const topicWords = topic.toLowerCase().split(/\s+/);
      const topicRelevance = topicWords.reduce((score, word) => 
        score + (messageWords.has(word) ? 1 : 0), 
      0) / topicWords.length;
      relevanceScore = Math.max(relevanceScore, topicRelevance);
    });
  
    return relevanceScore;
  }
  
  /**
   * Formats conversation statistics
   */
  export function formatConversationStats(stats) {
    return {
      duration: formatDuration(stats.duration),
      messageCount: stats.messageCount,
      activeTopics: stats.activeTopics,
      participantStats: Object.entries(stats.participantStats).map(([id, stats]) => ({
        participantId: id,
        messageCount: stats.messageCount,
        participationRate: `${(stats.participationRate * 100).toFixed(1)}%`,
        averageResponseTime: formatDuration(stats.averageResponseTime),
        topicContributions: Object.entries(stats.topicContributions)
          .map(([topic, count]) => `${topic}: ${count}`)
          .join(', ')
      })),
      openQuestions: stats.openQuestions,
      unaddressedPoints: stats.unaddressedPoints
    };
  }
  
  /**
   * Helper function to format duration
   */
  function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }
  
  /**
   * Validates and normalizes message content
   */
  export function validateMessage(message) {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message format');
    }
  
    return {
      id: message.id || Date.now(),
      senderId: message.senderId,
      senderName: message.senderName || 'Unknown',
      role: message.role || 'participant',
      content: (message.content || '').trim(),
      timestamp: message.timestamp || new Date().toISOString(),
      references: message.references || [],
      analysis: message.analysis || analyzeMessage(message.content || '')
    };
  }
  
  export default {
    analyzeMessage,
    calculateTopicRelevance,
    formatConversationStats,
    validateMessage
  };