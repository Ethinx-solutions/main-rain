export interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface FulfilmentInput {
  stripeEvent: StripeEvent;
  userId?: string;
  customerId: string;
}

export interface FulfilmentOutput {
  success: boolean;
  action: string;
  userUpdates?: {
    subscriptionStatus: string;
    accessLevel: string;
    billingPeriodEnd?: Date;
  };
  notifications: {
    type: 'email' | 'webhook' | 'admin';
    recipient: string;
    message: string;
  }[];
  auditLog: {
    eventId: string;
    action: string;
    timestamp: Date;
    result: 'success' | 'failure';
    details: any;
  };
}

export class StripeFulfilmentAgent {
  name = "Stripe Fulfilment Agent";
  version = "1.0.0";
  requiresExternalAccess = true;
  
  private stripeClient: any; // Stripe SDK instance
  private database: any; // Database connection
  
  constructor(stripeClient: any, database: any) {
    this.stripeClient = stripeClient;
    this.database = database;
  }
  
  async run(input: FulfilmentInput): Promise<FulfilmentOutput> {
    const auditLog = {
      eventId: input.stripeEvent.id,
      action: input.stripeEvent.type,
      timestamp: new Date(),
      result: 'success' as const,
      details: {}
    };

    try {
      switch (input.stripeEvent.type) {
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(input, auditLog);
        
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(input, auditLog);
        
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionCancelled(input, auditLog);
        
        case 'invoice.payment_succeeded':
          return await this.handlePaymentSucceeded(input, auditLog);
        
        case 'invoice.payment_failed':
          return await this.handlePaymentFailed(input, auditLog);
        
        default:
          return this.createOutput(false, 'unhandled_event', auditLog, []);
      }
    } catch (error) {
      auditLog.result = 'failure';
      auditLog.details = { error: error.message };
      
      return this.createOutput(false, 'error', auditLog, [{
        type: 'admin',
        recipient: 'admin@secondbrain.app',
        message: `Stripe fulfillment failed: ${error.message}`
      }]);
    }
  }

  private async handleSubscriptionCreated(
    input: FulfilmentInput, 
    auditLog: any
  ): Promise<FulfilmentOutput> {
    const subscription = input.stripeEvent.data.object;
    
    // Update user subscription status
    const userUpdates = {
      subscriptionStatus: 'active',
      accessLevel: this.mapPriceToAccessLevel(subscription.items.data[0].price.id),
      billingPeriodEnd: new Date(subscription.current_period_end * 1000)
    };

    await this.database.updateUser(input.customerId, userUpdates);
    
    const notifications = [{
      type: 'email' as const,
      recipient: input.customerId,
      message: 'Welcome to Second Brain Pro! Your subscription is now active.'
    }];

    auditLog.details = { subscription: subscription.id, accessLevel: userUpdates.accessLevel };
    
    return this.createOutput(true, 'subscription_activated', auditLog, notifications, userUpdates);
  }

  private async handleSubscriptionUpdated(
    input: FulfilmentInput, 
    auditLog: any
  ): Promise<FulfilmentOutput> {
    const subscription = input.stripeEvent.data.object;
    
    const userUpdates = {
      subscriptionStatus: subscription.status,
      accessLevel: this.mapPriceToAccessLevel(subscription.items.data[0].price.id),
      billingPeriodEnd: new Date(subscription.current_period_end * 1000)
    };

    await this.database.updateUser(input.customerId, userUpdates);
    
    const notifications = [{
      type: 'email' as const,
      recipient: input.customerId,
      message: 'Your subscription has been updated successfully.'
    }];

    auditLog.details = { subscription: subscription.id, newStatus: subscription.status };
    
    return this.createOutput(true, 'subscription_updated', auditLog, notifications, userUpdates);
  }

  private async handleSubscriptionCancelled(
    input: FulfilmentInput, 
    auditLog: any
  ): Promise<FulfilmentOutput> {
    const subscription = input.stripeEvent.data.object;
    
    const userUpdates = {
      subscriptionStatus: 'cancelled',
      accessLevel: 'free',
      billingPeriodEnd: new Date(subscription.ended_at * 1000)
    };

    await this.database.updateUser(input.customerId, userUpdates);
    
    const notifications = [
      {
        type: 'email' as const,
        recipient: input.customerId,
        message: 'Your subscription has been cancelled. You still have access until your billing period ends.'
      },
      {
        type: 'admin' as const,
        recipient: 'admin@secondbrain.app',
        message: `Subscription cancelled for customer ${input.customerId}`
      }
    ];

    auditLog.details = { subscription: subscription.id, endDate: subscription.ended_at };
    
    return this.createOutput(true, 'subscription_cancelled', auditLog, notifications, userUpdates);
  }

  private async handlePaymentSucceeded(
    input: FulfilmentInput, 
    auditLog: any
  ): Promise<FulfilmentOutput> {
    const invoice = input.stripeEvent.data.object;
    
    // Ensure subscription remains active
    const userUpdates = {
      subscriptionStatus: 'active',
      accessLevel: await this.getCurrentAccessLevel(input.customerId)
    };

    await this.database.updateUser(input.customerId, userUpdates);
    await this.database.logPayment(invoice.id, 'succeeded', invoice.amount_paid);
    
    const notifications = [{
      type: 'email' as const,
      recipient: input.customerId,
      message: 'Payment received successfully. Thank you for your continued subscription!'
    }];

    auditLog.details = { invoice: invoice.id, amount: invoice.amount_paid };
    
    return this.createOutput(true, 'payment_processed', auditLog, notifications, userUpdates);
  }

  private async handlePaymentFailed(
    input: FulfilmentInput, 
    auditLog: any
  ): Promise<FulfilmentOutput> {
    const invoice = input.stripeEvent.data.object;
    
    await this.database.logPayment(invoice.id, 'failed', invoice.amount_due);
    
    const notifications = [
      {
        type: 'email' as const,
        recipient: input.customerId,
        message: 'Payment failed. Please update your payment method to continue your subscription.'
      },
      {
        type: 'admin' as const,
        recipient: 'admin@secondbrain.app',
        message: `Payment failed for customer ${input.customerId}, amount: ${invoice.amount_due}`
      }
    ];

    auditLog.details = { invoice: invoice.id, amount: invoice.amount_due, reason: 'payment_failed' };
    
    return this.createOutput(true, 'payment_failed_handled', auditLog, notifications);
  }

  private mapPriceToAccessLevel(priceId: string): string {
    const priceMappings: Record<string, string> = {
      'price_basic': 'basic',
      'price_pro': 'pro',
      'price_enterprise': 'enterprise'
    };
    
    return priceMappings[priceId] || 'free';
  }

  private async getCurrentAccessLevel(customerId: string): Promise<string> {
    const user = await this.database.getUser(customerId);
    return user?.accessLevel || 'free';
  }

  private createOutput(
    success: boolean,
    action: string,
    auditLog: any,
    notifications: FulfilmentOutput['notifications'],
    userUpdates?: FulfilmentOutput['userUpdates']
  ): FulfilmentOutput {
    return {
      success,
      action,
      userUpdates,
      notifications,
      auditLog
    };
  }
}