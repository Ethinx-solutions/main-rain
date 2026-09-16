export interface LeverageMapperInput {
  situationAnalysis: {
    currentReality: string;
    keyInsights: string[];
    recommendedFocusAreas: string[];
    confidenceScore: number;
  };
  userGoals: string[];
  workflowInefficiencies: string[];
}

export interface LeverageMapperOutput {
  leverageMap: {
    area: string;
    impact: number; // 1-10 scale
    effort: number; // 1-10 scale
    leverageScore: number; // impact/effort ratio
  }[];
  priorityAreas: string[];
  quickWins: string[];
  strategicInitiatives: string[];
}

export class LeverageMapper {
  name = "Leverage Mapper";
  version = "1.0.0";
  
  async run(input: LeverageMapperInput): Promise<LeverageMapperOutput> {
    const leverageMap = this.createLeverageMap(input);
    const priorityAreas = this.identifyPriorityAreas(leverageMap);
    const { quickWins, strategicInitiatives } = this.categorizeInitiatives(leverageMap);
    
    return {
      leverageMap,
      priorityAreas,
      quickWins,
      strategicInitiatives
    };
  }

  private createLeverageMap(input: LeverageMapperInput): LeverageMapperOutput['leverageMap'] {
    const areas = [
      ...input.situationAnalysis.recommendedFocusAreas,
      ...this.deriveAdditionalAreas(input)
    ];

    return areas.map(area => {
      const impact = this.calculateImpact(area, input);
      const effort = this.calculateEffort(area, input);
      
      return {
        area,
        impact,
        effort,
        leverageScore: impact / effort
      };
    }).sort((a, b) => b.leverageScore - a.leverageScore);
  }

  private deriveAdditionalAreas(input: LeverageMapperInput): string[] {
    const additionalAreas: string[] = [];
    
    // Analyze inefficiencies for opportunities
    input.workflowInefficiencies.forEach(inefficiency => {
      if (inefficiency.includes('search')) {
        additionalAreas.push('Search optimization');
      }
      if (inefficiency.includes('duplicate')) {
        additionalAreas.push('Content deduplication');
      }
      if (inefficiency.includes('organization')) {
        additionalAreas.push('Information architecture');
      }
    });

    return additionalAreas;
  }

  private calculateImpact(area: string, input: LeverageMapperInput): number {
    let impact = 5; // Base impact

    // High impact areas
    const highImpactKeywords = ['synthesis', 'automation', 'search', 'prioritization'];
    if (highImpactKeywords.some(keyword => area.toLowerCase().includes(keyword))) {
      impact += 3;
    }

    // Goal alignment boost
    const alignsWithGoals = input.userGoals.some(goal => 
      goal.toLowerCase().includes(area.toLowerCase()) || 
      area.toLowerCase().includes(goal.toLowerCase())
    );
    if (alignsWithGoals) {
      impact += 2;
    }

    return Math.min(impact, 10);
  }

  private calculateEffort(area: string, input: LeverageMapperInput): number {
    let effort = 5; // Base effort

    // Low effort areas (quick wins)
    const lowEffortKeywords = ['organization', 'tagging', 'categorization'];
    if (lowEffortKeywords.some(keyword => area.toLowerCase().includes(keyword))) {
      effort -= 2;
    }

    // High effort areas
    const highEffortKeywords = ['automation', 'integration', 'ai'];
    if (highEffortKeywords.some(keyword => area.toLowerCase().includes(keyword))) {
      effort += 3;
    }

    return Math.max(Math.min(effort, 10), 1);
  }

  private identifyPriorityAreas(leverageMap: LeverageMapperOutput['leverageMap']): string[] {
    return leverageMap
      .filter(item => item.leverageScore > 1.5)
      .slice(0, 3)
      .map(item => item.area);
  }

  private categorizeInitiatives(leverageMap: LeverageMapperOutput['leverageMap']): {
    quickWins: string[];
    strategicInitiatives: string[];
  } {
    const quickWins = leverageMap
      .filter(item => item.effort <= 3 && item.impact >= 6)
      .map(item => item.area);

    const strategicInitiatives = leverageMap
      .filter(item => item.effort >= 7 && item.impact >= 8)
      .map(item => item.area);

    return { quickWins, strategicInitiatives };
  }
}