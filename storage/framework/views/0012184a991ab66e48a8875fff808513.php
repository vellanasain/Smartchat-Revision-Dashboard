<?php $__env->startSection('title', 'Tambah Revisi Baru'); ?>
<?php $__env->startSection('page_title', 'Tambah Revisi Baru'); ?>

<?php $__env->startSection('content'); ?>
<?php
    $clientOptions = $clients->map(fn ($client) => [
        'name' => $client->nama,
        'marketing_id' => $client->user_id,
    ])->values();
?>

<section class="form-page">
    <form class="edit-panel create-revision-form" action="<?php echo e(route('revisions.store')); ?>" method="POST">
        <?php echo csrf_field(); ?>

        <div class="form-header">
            <div>
                <p class="eyebrow">Revisi Website</p>
                <h2>Data Revisi Baru</h2>
            </div>
        </div>

        <?php if($errors->any()): ?>
            <div class="alert alert-danger"><?php echo e($errors->first()); ?></div>
        <?php endif; ?>

        <div class="form-grid">
            <label class="field">
                <span>Domain Sementara</span>
                <input type="text" name="domain" value="<?php echo e(old('domain')); ?>" placeholder="contoh: namadomain.asa17.com" required>
            </label>

            <label class="field">
                <span>Tim Marketing</span>
                <select name="user_id" data-marketing-select required>
                    <option value="">Pilih tim marketing</option>
                    <?php $__currentLoopData = $marketingUsers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $user): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <option value="<?php echo e($user->id); ?>" <?php if((int) old('user_id') === (int) $user->id): echo 'selected'; endif; ?>><?php echo e($user->name); ?></option>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </select>
            </label>

            <label class="field client-combobox">
                <span>Nama Klien</span>
                <input type="search" name="nama" value="<?php echo e(old('nama')); ?>" data-client-search placeholder="Pilih marketing dulu, lalu cari klien" autocomplete="off">
                <button type="button" class="combo-trigger" data-client-toggle aria-label="Tampilkan pilihan klien">▾</button>
                <div class="client-menu" data-client-menu></div>
            </label>

            <label class="field">
                <span>Tim Website</span>
                <select name="tim_design_id">
                    <option value="">--</option>
                    <?php $__currentLoopData = $teamUsers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $user): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <option value="<?php echo e($user->id); ?>" <?php if((int) old('tim_design_id') === (int) $user->id): echo 'selected'; endif; ?>><?php echo e($user->name); ?></option>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </select>
            </label>

            <label class="field">
                <span>Sisa Pelunasan</span>
                <input type="text" data-money-input placeholder="Rp 0" inputmode="numeric">
                <input type="hidden" name="sisa_pelunasan" value="<?php echo e(old('sisa_pelunasan')); ?>" data-money-value>
            </label>
        </div>

        <div class="form-actions">
            <a class="ghost-button" href="<?php echo e(route('revisions.index')); ?>">Back</a>
            <button class="primary-button" type="submit">Save</button>
        </div>
    </form>
</section>

<script type="application/json" id="client-data"><?php echo json_encode($clientOptions, 15, 512) ?></script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH D:\UI Revisi Web\revision-website-aravel\resources\views/revisions/create.blade.php ENDPATH**/ ?>