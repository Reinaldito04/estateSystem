declare module "mammoth/mammoth.browser" {
  interface ConvertToHtmlOptions {
    arrayBuffer: ArrayBuffer;
    [option: string]: any;
  }

  interface ConvertToHtmlResult {
    value: string;
    messages: Array<{ code: string; message: string; path: string }>;
    warnings: Array<{ code: string; message: string; path: string }>;
  }

  interface Mammoth {
    convertToHtml(options: ConvertToHtmlOptions): Promise<ConvertToHtmlResult>;
  }

  const mammoth: Mammoth;
  export default mammoth;
}