@extends('layouts.app')

@section('title', 'Application Logs')
@section('page_title', 'Application Logs')

@php
    $levelClass = function ($line) {
        if (str_contains($line, '.ERROR') || str_contains($line, ' ERROR:')) {
            return 'is-error';
        }

        if (str_contains($line, '.WARNING') || str_contains($line, ' WARNING:')) {
            return 'is-warning';
        }

        if (str_contains($line, '.INFO') || str_contains($line, ' INFO:')) {
            return 'is-info';
        }

        if (str_contains($line, '.DEBUG') || str_contains($line, ' DEBUG:')) {
            return 'is-debug';
        }

        return '';
    };
@endphp

@section('content')
<section class="debug-page">
    <div class="debug-toolbar">
        <div>
            <h2>Application Logs</h2>
            <p>{{ $logPath ? 'storage/logs/laravel.log' : 'Log file belum tersedia' }}{{ $updatedAt ? ' | Updated '.$updatedAt : '' }}</p>
        </div>
        <form class="debug-actions" method="GET" action="{{ route('debug.logs', [], false) }}">
            <select name="lines" aria-label="Jumlah baris log">
                @foreach ([100, 300, 500, 1000] as $option)
                    <option value="{{ $option }}" @selected((int) $lineCount === $option)>{{ $option }} lines</option>
                @endforeach
            </select>
            <button class="primary-button" type="submit">Refresh</button>
        </form>
    </div>

    <div class="log-panel" aria-label="Application log output">
        @forelse ($lines as $line)
            <div class="log-line {{ $levelClass($line) }}">{{ $line }}</div>
        @empty
            <div class="log-empty">Belum ada log yang bisa ditampilkan.</div>
        @endforelse
    </div>
</section>
@endsection
