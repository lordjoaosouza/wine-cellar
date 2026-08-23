export async function toImageDataUri(uri: string): Promise<string> {
  if (uri.startsWith("data:")) {
    return uri;
  }

  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
