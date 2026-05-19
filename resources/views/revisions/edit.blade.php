@extends('layouts.app')

@section('title', 'Detail Revisi #' . $revision->id)
@section('page_title', 'Detail Revisi')

@php
    $group = $revision->group;
    $conversation = $revision->conversation;
    $domain = optional($group)->domain ?: optional($conversation)->domain ?: '-';
    $money = fn ($value) => filled($value) ? 'Rp ' . number_format((int) $value, 0, ',', '.') : '-';
    $payment = '-';
    $notesText = (string) optional($conversation)->notes;

    $formatNotesMoney = function ($value) {
        if (!filled($value)) {
            return '';
        }

        $rawValue = trim((string) $value);
        if (stripos($rawValue, 'rp') !== false) {
            return $rawValue;
        }

        $numeric = (int) preg_replace('/\D/', '', $rawValue);
        if ($numeric <= 0) {
            return $rawValue;
        }

        return 'Rp '.number_format($numeric < 10000 ? $numeric * 1000 : $numeric, 0, ',', '.');
    };

    $parseProjectNotes = function ($notes) use ($formatNotesMoney) {
        $result = [
            'package_website' => '',
            'biaya' => '',
            'domain_resmi' => '',
        ];

        if (!filled($notes)) {
            return $result;
        }

        $decoded = json_decode($notes, true);
        if (is_array($decoded)) {
            return array_merge($result, $decoded);
        }

        if (preg_match('/Paket\s*Website\s*:\s*([^\r\n]+)/i', $notes, $match)) {
            $result['package_website'] = trim($match[1]);
        }

        if (preg_match('/Biaya\s*:\s*([^\r\n]+)/i', $notes, $match)) {
            $result['biaya'] = $formatNotesMoney($match[1]);
        }

        if (preg_match('/Domain\s*Resmi\s*:\s*([^\r\n]+)/i', $notes, $match)) {
            $result['domain_resmi'] = trim($match[1]);
        }

        $lines = collect(preg_split("/\r\n|\n|\r/", trim($notes)))
            ->map(fn ($line) => trim((string) $line))
            ->filter()
            ->values();
        $firstLine = $lines->first() ?? '';
        $parts = collect(preg_split('/\s+/', $firstLine))
            ->map(fn ($part) => trim((string) $part))
            ->filter()
            ->values();
        $packages = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

        if (!$result['package_website']) {
            $package = $parts->first(fn ($part) => in_array(strtolower($part), $packages, true));
            $result['package_website'] = $package ? ucfirst(strtolower($package)) : '';
        }

        if (!$result['biaya']) {
            $packageIndex = $parts->search(fn ($part) => in_array(strtolower($part), $packages, true));
            $rawValue = null;

            if ($packageIndex !== false) {
                $rawValue = $parts
                    ->slice($packageIndex + 1)
                    ->first(fn ($part) => preg_match('/^\d+([.,]\d+)?$/', $part));
            }

            if (!$rawValue) {
                $rawValue = $parts->filter(fn ($part) => preg_match('/^\d+([.,]\d+)?$/', $part))->values()->first();
            }

            if ($rawValue) {
                $result['biaya'] = $formatNotesMoney($rawValue);
            }
        }

        if (!$result['domain_resmi']) {
            preg_match_all('/\b([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)\b/i', $notes, $matches);
            $domains = collect($matches[1] ?? [])
                ->map(fn ($domain) => strtolower(trim($domain)))
                ->unique()
                ->values();

            if ($domains->count() > 1) {
                $result['domain_resmi'] = $domains->last();
            } elseif ($domains->count() === 1 && $lines->count() > 1) {
                $result['domain_resmi'] = $domains->first();
            }
        }

        return $result;
    };

    $notesAmount = function ($notes) {
        if (!filled($notes)) {
            return null;
        }

        $firstLine = preg_split("/\r\n|\n|\r/", trim($notes))[0] ?? '';
        $parts = preg_split('/\s+/', $firstLine);
        $numbers = collect($parts)
            ->map(fn ($part) => trim((string) $part))
            ->filter(fn ($part) => preg_match('/^\d+([.,]\d+)?$/', $part))
            ->values();

        $value = $numbers->get(1) ?? null;
        if (!$value) {
            return null;
        }

        $numeric = (int) preg_replace('/\D/', '', $value);
        return $numeric > 0 && $numeric < 10000 ? $numeric * 1000 : $numeric;
    };

    $remainingPayment = function ($conversation) use ($notesAmount) {
        if (!$conversation) {
            return null;
        }

        if ((int) $conversation->is_automate_pelunasan === 1 && filled($conversation->sisa_pelunasan)) {
            return (int) $conversation->sisa_pelunasan;
        }

        return filled($conversation->sisa_pelunasan)
            ? (int) $conversation->sisa_pelunasan
            : $notesAmount($conversation->notes);
    };

    $paidFlag = fn ($value) => (int) $value === 1 ? 1 : 0;
    $is50Paid = $paidFlag(optional(optional($conversation)->userInfo)->is_50_paid);
    $isPaid = $paidFlag(optional(optional($conversation)->userInfo)->is_paid);
    $payment = $isPaid === 1
        ? 'Lunas'
        : ($is50Paid === 1 ? '50% Lunas' : 'Belum Lunas');

    $projectNotes = $parseProjectNotes($notesText);
    $info = optional($conversation)->userInfo;

    if (!$projectNotes['package_website'] && filled(optional($info)->package)) {
        $projectNotes['package_website'] = $info->package;
    }

    if (!$projectNotes['biaya'] && filled(optional($info)->monthly_bill)) {
        $projectNotes['biaya'] = $formatNotesMoney($info->monthly_bill);
    }

    if (!$projectNotes['domain_resmi'] && filled(optional($info)->domain)) {
        $projectNotes['domain_resmi'] = $info->domain;
    }

    $stageLabels = [
        '' => '--',
        'waiting_client_data' => 'Waiting Client Data',
        'ready_to_revision' => 'Ready to Revision',
    ];

    $workLabels = [
        '' => '--',
        'not_started' => 'Not Started',
        'on_process' => 'On Progress',
        'done' => 'Done',
    ];

    $r0WorkLabels = [
        '' => '--',
        'done' => 'Done',
    ];

    $doneByUserInfo = function ($jenis) use ($info) {
        $column = 'is_rev_'.$jenis.'_done';

        return $info && (int) $info->{$column} === 1;
    };

    $currentRevisionLevel = function () use ($doneByUserInfo) {
        for ($jenis = 0; $jenis <= 3; $jenis++) {
            if (!$doneByUserInfo($jenis)) {
                return $jenis;
            }
        }

        return 3;
    };

    $currentRevision = $currentRevisionLevel();

    $workValue = function ($row, $jenis) use ($doneByUserInfo, $currentRevision) {
        if ($doneByUserInfo($jenis)) {
            return 'done';
        }

        if (!$row) {
            return $jenis === $currentRevision ? 'not_started' : '';
        }

        if ((int) $row->is_answered === 1) {
            return 'done';
        }

        if ((int) $row->is_collecting === 1) {
            return 'on_process';
        }

        return $jenis === $currentRevision ? 'not_started' : '';
    };

    $stageValueFor = function ($row, $jenis) use ($doneByUserInfo, $currentRevision) {
        if ($jenis === 0) {
            return '';
        }

        if ($doneByUserInfo($jenis)) {
            return 'ready_to_revision';
        }

        if (filled(optional($row)->response)) {
            return $row->response;
        }

        if ($jenis === $currentRevision && $row && ((int) $row->is_collecting === 1 || (int) $row->is_answered === 1)) {
            return 'ready_to_revision';
        }

        return '';
    };
@endphp

@section('content')
<section class="detail-layout">
    <form id="revision-detail-form" class="revision-work-panel" action="{{ route('revisions.update', $revision->id) }}" method="POST">
        @csrf
        @method('PUT')

        <div class="form-header">
            <div>
                <p class="eyebrow">Revision Workflow</p>
                <h2>{{ $domain }}</h2>
            </div>
        </div>

        @if ($errors->any())
            <div class="alert alert-danger">{{ $errors->first() }}</div>
        @endif

        <div class="workflow-table-wrap">
            <table class="workflow-table">
                <thead>
                    <tr>
                        <th>Status Revisi</th>
                        <th>Revision Stage</th>
                        <th>Work Status</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    @for ($jenis = 0; $jenis <= 3; $jenis++)
                        @php
                            $row = optional($group)->revisions?->firstWhere('jenis', $jenis);
                            $stageValue = old("stages.$jenis", $stageValueFor($row, $jenis));
                            $workStatus = old("work_statuses.$jenis", $workValue($row, $jenis));
                        @endphp
                        <tr>
                            <td>
                                <span class="revision-code">R{{ $jenis }}</span>
                                <small>{{ $jenis === 0 ? 'Website sudah jadi' : 'Revisi '.$jenis }}</small>
                            </td>
                            <td>
                                @if ($jenis === 0)
                                    <span class="static-select">--</span>
                                @else
                                    <select name="stages[{{ $jenis }}]" data-revision-stage>
                                        @foreach ($stageLabels as $value => $label)
                                            <option value="{{ $value }}" @selected($stageValue === $value)>{{ $label }}</option>
                                        @endforeach
                                    </select>
                                @endif
                            </td>
                            <td>
                                <select name="work_statuses[{{ $jenis }}]" data-work-status>
                                    @foreach ($jenis === 0 ? $r0WorkLabels : $workLabels as $value => $label)
                                        <option value="{{ $value }}" @selected($workStatus === $value)>{{ $label }}</option>
                                    @endforeach
                                </select>
                            </td>
                            <td>
                                <input type="hidden" name="revision_notes[{{ $jenis }}]" value="{{ old("revision_notes.$jenis", optional($row)->notes) }}" data-note-value="{{ $jenis }}">
                                <button class="note-button" type="button" data-note-open="{{ $jenis }}" aria-label="Buka notes R{{ $jenis }}">
                                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"></path><path d="M14 3v5h5"></path><path d="M9 13h6"></path><path d="M9 17h6"></path></svg>
                                </button>
                            </td>
                        </tr>
                    @endfor
                </tbody>
            </table>
        </div>

        <div class="form-actions">
            <a class="ghost-button" href="{{ route('revisions.index') }}">Back</a>
            <button class="primary-button" type="submit">Update</button>
        </div>
    </form>

    <aside class="revision-info-panel">
        <div class="side-section">
            <p class="eyebrow">Project Info</p>
            <dl class="info-list">
                <div><dt>Domain Sementara</dt><dd>{{ $domain }}</dd></div>
                <div><dt>Nama Klien</dt><dd>{{ optional($conversation)->nama ?: '-' }}</dd></div>
                <div><dt>Tim Marketing</dt><dd>{{ optional(optional($conversation)->marketing)->name ?: '-' }}</dd></div>
                <div><dt>Tim Web</dt><dd>{{ optional(optional($conversation)->timWebsite)->name ?: '--' }}</dd></div>
                <div><dt>Sisa Pelunasan</dt><dd>{{ $money($remainingPayment($conversation)) }}</dd></div>
                <div><dt>Status Pembayaran</dt><dd>{{ $payment }}</dd></div>
                <div><dt>Tanggal Pelunasan</dt><dd>{{ optional(optional($conversation)->tanggal_pelunasan)->format('d/m/Y') ?: '-' }}</dd></div>
            </dl>
        </div>

        <div class="side-section project-notes">
            <p class="eyebrow">Notes Project</p>
            <label class="field">
                <span>Paket Website</span>
                <input form="revision-detail-form" type="text" name="project_notes[package_website]" value="{{ old('project_notes.package_website', $projectNotes['package_website'] ?? '') }}">
            </label>
            <label class="field">
                <span>Biaya</span>
                <input form="revision-detail-form" type="text" name="project_notes[biaya]" value="{{ old('project_notes.biaya', $projectNotes['biaya'] ?? '') }}">
            </label>
            <label class="field">
                <span>Domain Resmi</span>
                <input form="revision-detail-form" type="text" name="project_notes[domain_resmi]" value="{{ old('project_notes.domain_resmi', $projectNotes['domain_resmi'] ?? '') }}">
            </label>
        </div>
    </aside>
</section>

<div class="note-modal" data-note-modal hidden>
    <div class="note-modal-backdrop" data-note-close></div>
    <section class="note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-dialog-title">
        <header>
            <h2 id="note-dialog-title">Notes</h2>
        </header>
        <div class="note-dialog-body">
            <label class="field">
                <span>Notes</span>
                <textarea data-note-editor rows="10"></textarea>
            </label>
        </div>
        <footer>
            <button class="ghost-button" type="button" data-note-close>Back</button>
            <button class="primary-button" type="button" data-note-save>Save</button>
        </footer>
    </section>
</div>
@endsection
