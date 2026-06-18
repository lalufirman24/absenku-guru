// Reusable Server-Side AI Service for Absenku Guru
// This file runs strictly on the server side and is used to communicate with the 9Router gateway.

export interface AIServicePayload {
  className: string;
  students: Array<{ nis: string; name: string; parentName: string }>;
  attendance: Array<{ date: string; namaSiswa: string; nis: string; status: string }>;
}

export async function analyzeAttendanceWithAI(payload: AIServicePayload): Promise<string> {
  const apiKey = process.env.NINE_ROUTER_API_KEY;
  const baseUrl = process.env.NINE_ROUTER_BASE_URL || 'https://rektjmf.abc-tunnel.us/v1';
  const model = process.env.GEMINI_MODEL || 'google/gemini-2.5-flash';

  // 1. Error Handling: API Key Kosong
  if (!apiKey) {
    throw new Error('API Key untuk 9Router (NINE_ROUTER_API_KEY) tidak ditemukan atau belum dikonfigurasi di server.');
  }

  const systemPrompt = `Anda adalah Asisten Analisis Absensi Sekolah berbasis AI ("Absenku Guru AI").
Tugas Anda adalah menganalisis data kehadiran kelas, mendeteksi siswa yang bermasalah (terutama yang sering Alpa, Sakit, atau Izin), mendeteksi tren kehadiran kelas, dan memberikan rekomendasi konkret, empatik, serta taktis kepada guru kelas.

Format Output Laporan Analisis harus menggunakan Markdown yang bersih dan rapi dengan struktur berikut:

# Laporan Analisis Kehadiran AI - Kelas [Nama Kelas]
[Berikan deskripsi singkat ringkasan eksekutif kehadiran kelas secara umum]

## 1. Ringkasan Statistik
- Berikan statistik singkat seperti rata-rata tingkat kehadiran, persentase kehadiran keseluruhan.
- Hari dengan ketidakhadiran tertinggi.

## 2. Identifikasi Siswa Bermasalah (Perhatian Khusus)
- Identifikasi siswa yang memiliki absensi mencurigakan atau tingkat ketidakhadiran tinggi (terutama Alpa > 2 kali, atau Sakit/Izin beruntun).
- Sebutkan nama siswa dan rincian jumlah status kehadirannya.
- Berikan analisis singkat kemungkinan penyebab atau dampak akademisnya.

## 3. Tren & Pola Kehadiran
- Apakah ada hari tertentu (misal: Senin atau Jumat) di mana absensi cenderung rendah?
- Pola-pola lain yang terlihat dari data.

## 4. Rekomendasi Tindakan Wali Kelas
- Rekomendasi konkret dan bertahap untuk wali kelas (misal: memanggil orang tua siswa X, berdiskusi dengan guru BK, melakukan pendekatan personal).
- Rekomendasi umum untuk meningkatkan kedisiplinan kelas.

Gunakan bahasa Indonesia yang profesional, ramah, dan solutif. Jangan membuat rekomendasi yang terlalu umum, sesuaikan dengan data spesifik siswa yang dianalisis.`;

  const userPrompt = `Berikut adalah data kehadiran untuk Kelas: ${payload.className}

Daftar Siswa di Kelas:
${JSON.stringify(payload.students, null, 2)}

Data Catatan Kehadiran Historis:
${JSON.stringify(payload.attendance, null, 2)}

Harap berikan analisis mendalam berdasarkan data di atas sesuai instruksi sistem.`;

  // Define Request Timeout (15 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 3. Error Handling: API Gateway Errors (Model tidak tersedia, quota habis, dll)
    if (!response.ok) {
      const errorText = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch (e) {
        // Response is not JSON
      }

      const errMsg = parsedError?.error?.message || response.statusText || errorText;
      if (response.status === 404) {
        throw new Error(`Model AI "${model}" tidak tersedia di gateway 9Router.`);
      }
      throw new Error(`9Router API Error (Status ${response.status}): ${errMsg}`);
    }

    const responseText = await response.text();
    let markdownResult = '';

    // Handle both Stream (SSE) and Standard JSON responses
    const trimmedText = responseText.trim();
    if (trimmedText.startsWith('data:')) {
      const lines = trimmedText.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
          try {
            const json = JSON.parse(trimmedLine.substring(6));
            const chunkText = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
            markdownResult += chunkText;
          } catch (e) {
            // Ignore parse errors on individual stream lines
          }
        }
      }
    } else {
      try {
        const data = JSON.parse(trimmedText);
        markdownResult = data.choices?.[0]?.message?.content || '';
      } catch (e) {
        throw new Error(`Gagal mem-parsing response JSON dari 9Router: ${responseText}`);
      }
    }
    
    if (!markdownResult) {
      throw new Error('Respons dari 9Router kosong atau tidak memiliki format yang valid.');
    }

    return markdownResult;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // 4. Error Handling: Timeout Request
    if (error.name === 'AbortError') {
      throw new Error('Koneksi ke 9Router terputus karena batas waktu request habis (Timeout 15 detik). Silakan coba lagi.');
    }

    // 2. Error Handling: 9Router Tidak Aktif (Connection Refused)
    if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      throw new Error(`Tidak dapat terhubung ke 9Router di ${baseUrl}. Pastikan 9Router service/tunnel Anda aktif.`);
    }

    throw error;
  }
}
