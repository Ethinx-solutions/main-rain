export interface SituationAnalystInput {
  intakeAnswers: Record<string, any>;
  userArchetype: string;
  usagePatterns?: {
    notesCount: number;
    tasksCount: number;
    linksCount: number;
    activeCategories: string[];
  };
}

export interface SituationAnalystOutput {
  currentReality: string;
  keyInsights: string[];
  recommendedFocusAreas: string[];
  confidenceScore: number;
}

export class SituationAnalyst {
  name = "Situation Analyst";
  version = "1.0.0";
  
  async run(input: SituationAnalystInput): Promise<SituationAnalystOutput> {
    // Analyze user's current situation based on intake data
    const insights = this.extractKeyInsights(input);
    const focusAreas = this.identifyFocusAreas(input, insights);
    const narrative = this.generateCurrentReality(input, insights);
    
    return {
      currentReality: narrative,
      keyInsights: insights,
      recommendedFocusAreas: focusAreas,
      confidenceScore: this.calculateConfidence(input)
    };
  }

  private extractKeyInsights(input: SituationAnalystInput): string[] {
    const insights: string[] = [];
    
    // Analyze archetype patterns
    if (input.userArchetype === 'knowledge-worker') {
      insights.push("Heavy information processing needs");
    }
    
    // Analyze usage patterns
    if (input.usagePatterns) {
      const { notesCount, tasksCount, linksCount } = input.usagePatterns;
      
      if (notesCount > tasksCount * 2) {
        insights.push("Information capture focused over task execution");
      }
      
      if (linksCount > 50) {
        insights.push("High external resource dependency");
      }
    }
    
    return insights;
  }

  private identifyFocusAreas(input: SituationAnalystInput, insights: string[]): string[] {
    const focusAreas: string[] = [];
    
    // Base recommendations on archetype
    switch (input.userArchetype) {
      case 'knowledge-worker':
        focusAreas.push("Information synthesis", "Knowledge connections");
        break;
      case 'project-manager':
        focusAreas.push("Task prioritization", "Team coordination");
        break;
      case 'creative':
        focusAreas.push("Idea development", "Creative workflows");
        break;
    }
    
    return focusAreas;
  }

  private generateCurrentReality(input: SituationAnalystInput, insights: string[]): string {
    return `Based on your profile as a ${input.userArchetype}, you appear to be someone who ${insights.join(', ')}. Your current workflow suggests opportunities for optimization in knowledge management and task execution.`;
  }

  private calculateConfidence(input: SituationAnalystInput): number {
    let confidence = 0.5; // Base confidence
    
    if (input.usagePatterns) {
      confidence += 0.3; // More data available
    }
    
    if (Object.keys(input.intakeAnswers).length > 5) {
      confidence += 0.2; // Comprehensive intake
    }
    
    return Math.min(confidence, 1.0);
  }
}