<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class DebugController extends Controller
{
    public function logs(Request $request)
    {
        $lines = max(50, min((int) $request->query('lines', 300), 1000));
        $path = storage_path('logs/laravel.log');

        return view('debug.logs', [
            'lines' => $this->tail($path, $lines),
            'lineCount' => $lines,
            'logPath' => File::exists($path) ? $path : null,
            'updatedAt' => File::exists($path) ? date('Y-m-d H:i:s', File::lastModified($path)) : null,
        ]);
    }

    private function tail(string $path, int $lineCount): array
    {
        if (!File::exists($path) || !File::isReadable($path)) {
            return [];
        }

        $handle = fopen($path, 'rb');
        if (!$handle) {
            return [];
        }

        $buffer = '';
        $chunkSize = 4096;
        $position = -1;
        $lines = 0;

        fseek($handle, 0, SEEK_END);
        $fileSize = ftell($handle);

        while ($fileSize + $position >= 0 && $lines <= $lineCount) {
            $seek = max($fileSize + $position - $chunkSize + 1, 0);
            $readSize = min($chunkSize, $fileSize + $position + 1);

            fseek($handle, $seek);
            $chunk = fread($handle, $readSize);
            $buffer = $chunk.$buffer;
            $lines = substr_count($buffer, "\n");
            $position -= $chunkSize;
        }

        fclose($handle);

        return collect(explode("\n", trim($buffer)))
            ->filter(fn ($line) => $line !== '')
            ->take(-$lineCount)
            ->values()
            ->all();
    }
}
