@extends('layouts.app')

@section('title', 'Tambah Revisi Baru')
@section('page_title', 'Tambah Revisi Baru')

@section('content')
@php
    $clientOptions = $clients->map(fn ($client) => [
        'name' => $client->nama,
        'marketing_id' => $client->user_id,
    ])->values();
@endphp

<section class="form-page">
    <form class="edit-panel create-revision-form" action="{{ route('revisions.store') }}" method="POST">
        @csrf

        <div class="form-header">
            <div>
                <p class="eyebrow">Revisi Website</p>
                <h2>Data Revisi Baru</h2>
            </div>
        </div>

        @if ($errors->any())
            <div class="alert alert-danger">{{ $errors->first() }}</div>
        @endif

        <div class="form-grid">
            <label class="field">
                <span>Domain Sementara</span>
                <input type="text" name="domain" value="{{ old('domain') }}" placeholder="contoh: namadomain.asa17.com" required>
            </label>

            <label class="field">
                <span>Tim Marketing</span>
                <select name="user_id" data-marketing-select required>
                    <option value="">Pilih tim marketing</option>
                    @foreach ($marketingUsers as $user)
                        <option value="{{ $user->id }}" @selected((int) old('user_id') === (int) $user->id)>{{ $user->name }}</option>
                    @endforeach
                </select>
            </label>

            <label class="field client-combobox">
                <span>Nama Klien</span>
                <input type="search" name="nama" value="{{ old('nama') }}" data-client-search placeholder="Pilih marketing dulu, lalu cari klien" autocomplete="off">
                <button type="button" class="combo-trigger" data-client-toggle aria-label="Tampilkan pilihan klien">▾</button>
                <div class="client-menu" data-client-menu></div>
            </label>

            <label class="field">
                <span>Tim Website</span>
                <select name="tim_design_id">
                    <option value="">--</option>
                    @foreach ($teamUsers as $user)
                        <option value="{{ $user->id }}" @selected((int) old('tim_design_id') === (int) $user->id)>{{ $user->name }}</option>
                    @endforeach
                </select>
            </label>

            <label class="field">
                <span>Sisa Pelunasan</span>
                <input type="text" data-money-input placeholder="Rp 0" inputmode="numeric">
                <input type="hidden" name="sisa_pelunasan" value="{{ old('sisa_pelunasan') }}" data-money-value>
            </label>
        </div>

        <div class="form-actions">
            <a class="ghost-button" href="{{ route('revisions.index') }}">Back</a>
            <button class="primary-button" type="submit">Save</button>
        </div>
    </form>
</section>

<script type="application/json" id="client-data">@json($clientOptions)</script>
@endsection
