declare module 'expo-document-picker' {
    export interface DocumentPickerSuccessResult {
      assets: Array<{
        uri: string;
        mimeType: string;
        name: string;
        size: number;
      }>;
      type: 'success';
    }
  
    export type DocumentPickerResult =
      | DocumentPickerSuccessResult
      | { type: 'cancel' };
  
    export function getDocumentAsync(options: {
      type: string;
      copyToCacheDirectory?: boolean;
    }): Promise<DocumentPickerResult>;
  }
  