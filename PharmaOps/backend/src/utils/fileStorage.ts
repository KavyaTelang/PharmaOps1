export const uploadFile = async (buffer: Buffer, filename: string, folder: string = 'documents') => {
  // Mock file upload - returns simulated S3 URL
  const key = `${folder}/${Date.now()}-${filename}`;
  return {
    key,
    url: `s3://pharmaops-documents/${key}`,
    bucket: 'pharmaops-documents',
  };
};