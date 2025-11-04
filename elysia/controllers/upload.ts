import Elysia, { t } from "elysia";
import { auth } from "../lib/auth";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), "public", "uploads");

async function ensureUploadsDir() {
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }
}

export const uploadController = new Elysia({ prefix: '/upload' })
  .post('/image', async ({ body, request }) => {
    try {
      // Get session from better-auth
      const session = await auth.api.getSession({ headers: request.headers });
      
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      await ensureUploadsDir();

      const file = body.file;
      if (!file) {
        return {
          success: false,
          error: 'No file provided',
        };
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = join(uploadsDir, fileName);

      // Write file to disk
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);

      // Return the URL path (not full URL, just the path)
      const fileUrl = `/uploads/${fileName}`;

      return {
        success: true,
        data: {
          url: fileUrl,
          fileName: fileName,
          originalName: file.name,
          size: file.size,
          type: file.type,
        },
      };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file',
      };
    }
  }, {
    body: t.Object({
      file: t.File({
        format: 'image/*',
        maxSize: '10m', // 10MB max
      }),
    }),
  });

