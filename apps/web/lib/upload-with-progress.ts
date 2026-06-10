type UploadProgressOptions = {
  url: string;
  formData: FormData;
  onProgress?: (percent: number) => void;
};

type UploadResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

export function uploadFormDataWithProgress<T = unknown>({
  url,
  formData,
  onProgress,
}: UploadProgressOptions): Promise<UploadResult<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    };

    xhr.onload = () => {
      let data: T;
      try {
        data = JSON.parse(xhr.responseText) as T;
      } catch {
        reject(new Error("Réponse serveur invalide"));
        return;
      }

      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
      });
    };

    xhr.onerror = () => reject(new Error("Erreur réseau lors de l'upload"));
    xhr.send(formData);
  });
}
