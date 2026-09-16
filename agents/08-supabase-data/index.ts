export interface SupabaseDataInput {
  operation: 'create' | 'read' | 'update' | 'delete' | 'upload' | 'download';
  table?: string;
  data?: any;
  query?: {
    filters?: Record<string, any>;
    orderBy?: string;
    limit?: number;
    offset?: number;
  };
  file?: {
    name: string;
    content: Buffer | Blob;
    bucket: string;
    path: string;
  };
  userId: string;
  sessionToken: string;
}

export interface SupabaseDataOutput {
  success: boolean;
  operation: string;
  data?: any;
  error?: string;
  metadata?: {
    rowsAffected?: number;
    fileUrl?: string;
    signedUrl?: string;
    expiresAt?: Date;
  };
  auditLog: {
    userId: string;
    operation: string;
    table?: string;
    timestamp: Date;
    success: boolean;
    details: any;
  };
}

export class SupabaseDataAgent {
  name = "Supabase Data Agent";
  version = "1.0.0";
  requiresExternalAccess = true;
  
  private supabase: any; // Supabase client instance
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }
  
  async run(input: SupabaseDataInput): Promise<SupabaseDataOutput> {
    const auditLog = {
      userId: input.userId,
      operation: input.operation,
      table: input.table,
      timestamp: new Date(),
      success: false,
      details: {}
    };

    try {
      // Validate session
      const isValidSession = await this.validateSession(input.sessionToken, input.userId);
      if (!isValidSession) {
        throw new Error('Invalid session or unauthorized access');
      }

      let result: any;
      let metadata: any = {};

      switch (input.operation) {
        case 'create':
          result = await this.handleCreate(input);
          metadata.rowsAffected = 1;
          break;
        
        case 'read':
          result = await this.handleRead(input);
          metadata.rowsAffected = result?.length || 0;
          break;
        
        case 'update':
          result = await this.handleUpdate(input);
          metadata.rowsAffected = result?.length || 0;
          break;
        
        case 'delete':
          result = await this.handleDelete(input);
          metadata.rowsAffected = result?.length || 0;
          break;
        
        case 'upload':
          result = await this.handleUpload(input);
          metadata.fileUrl = result.publicUrl;
          break;
        
        case 'download':
          result = await this.handleDownload(input);
          metadata.signedUrl = result.signedUrl;
          metadata.expiresAt = result.expiresAt;
          break;
        
        default:
          throw new Error(`Unsupported operation: ${input.operation}`);
      }

      auditLog.success = true;
      auditLog.details = { metadata, dataSize: this.getDataSize(result) };

      return {
        success: true,
        operation: input.operation,
        data: result,
        metadata,
        auditLog
      };

    } catch (error) {
      auditLog.details = { error: error.message };
      
      return {
        success: false,
        operation: input.operation,
        error: error.message,
        auditLog
      };
    }
  }

  private async validateSession(sessionToken: string, userId: string): Promise<boolean> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(sessionToken);
      return !error && user?.id === userId;
    } catch {
      return false;
    }
  }

  private async handleCreate(input: SupabaseDataInput): Promise<any> {
    if (!input.table || !input.data) {
      throw new Error('Table and data required for create operation');
    }

    // Ensure user ownership
    const dataWithUser = {
      ...input.data,
      user_id: input.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from(input.table)
      .insert(dataWithUser)
      .select()
      .single();

    if (error) throw new Error(`Create failed: ${error.message}`);
    return data;
  }

  private async handleRead(input: SupabaseDataInput): Promise<any> {
    if (!input.table) {
      throw new Error('Table required for read operation');
    }

    let query = this.supabase
      .from(input.table)
      .select('*')
      .eq('user_id', input.userId); // Enforce row-level security

    // Apply filters
    if (input.query?.filters) {
      Object.entries(input.query.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Apply ordering
    if (input.query?.orderBy) {
      query = query.order(input.query.orderBy);
    }

    // Apply pagination
    if (input.query?.limit) {
      query = query.limit(input.query.limit);
    }
    if (input.query?.offset) {
      query = query.range(input.query.offset, input.query.offset + (input.query.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Read failed: ${error.message}`);
    return data;
  }

  private async handleUpdate(input: SupabaseDataInput): Promise<any> {
    if (!input.table || !input.data) {
      throw new Error('Table and data required for update operation');
    }

    const updateData = {
      ...input.data,
      updated_at: new Date().toISOString()
    };

    let query = this.supabase
      .from(input.table)
      .update(updateData)
      .eq('user_id', input.userId); // Enforce user ownership

    // Apply filters for specific record updates
    if (input.query?.filters) {
      Object.entries(input.query.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query.select();
    if (error) throw new Error(`Update failed: ${error.message}`);
    return data;
  }

  private async handleDelete(input: SupabaseDataInput): Promise<any> {
    if (!input.table) {
      throw new Error('Table required for delete operation');
    }

    let query = this.supabase
      .from(input.table)
      .delete()
      .eq('user_id', input.userId); // Enforce user ownership

    // Apply filters for specific record deletion
    if (input.query?.filters) {
      Object.entries(input.query.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query.select();
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return data;
  }

  private async handleUpload(input: SupabaseDataInput): Promise<any> {
    if (!input.file) {
      throw new Error('File data required for upload operation');
    }

    const { name, content, bucket, path } = input.file;
    const fullPath = `${input.userId}/${path}/${name}`;

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(fullPath, content, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    // Get public URL
    const { data: publicUrlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(fullPath);

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
      fullPath
    };
  }

  private async handleDownload(input: SupabaseDataInput): Promise<any> {
    if (!input.file?.bucket || !input.file?.path) {
      throw new Error('Bucket and path required for download operation');
    }

    const fullPath = `${input.userId}/${input.file.path}`;

    // Generate signed URL for secure access
    const { data, error } = await this.supabase.storage
      .from(input.file.bucket)
      .createSignedUrl(fullPath, 3600); // 1 hour expiry

    if (error) throw new Error(`Download failed: ${error.message}`);

    return {
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour from now
    };
  }

  private getDataSize(data: any): number {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object') return Object.keys(data).length;
    return 1;
  }

  // Utility methods for specific Second Brain operations
  async createNote(userId: string, sessionToken: string, noteData: any): Promise<SupabaseDataOutput> {
    return this.run({
      operation: 'create',
      table: 'notes',
      data: noteData,
      userId,
      sessionToken
    });
  }

  async getUserNotes(userId: string, sessionToken: string, filters?: any): Promise<SupabaseDataOutput> {
    return this.run({
      operation: 'read',
      table: 'notes',
      query: { filters, orderBy: 'created_at' },
      userId,
      sessionToken
    });
  }

  async createTask(userId: string, sessionToken: string, taskData: any): Promise<SupabaseDataOutput> {
    return this.run({
      operation: 'create',
      table: 'tasks',
      data: taskData,
      userId,
      sessionToken
    });
  }

  async createLink(userId: string, sessionToken: string, linkData: any): Promise<SupabaseDataOutput> {
    return this.run({
      operation: 'create',
      table: 'links',
      data: linkData,
      userId,
      sessionToken
    });
  }
}