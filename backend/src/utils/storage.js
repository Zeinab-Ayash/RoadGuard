const supabase = require('./dbConnection');

async function uploadImage({ bucket, path, file, contentType }) {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

module.exports = { uploadImage };
