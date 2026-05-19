<?php $__env->startSection('title', 'Daftar Revisi Website'); ?>
<?php $__env->startSection('page_title', 'Daftar Revisi Website'); ?>

<?php
    $filters = [
        'all' => 'Semua',
        'unpaid' => 'Belum Lunas',
        'process_revision' => 'Proses Revisi',
        'revision_done' => 'Revisi Sudah Selesai',
    ];

    $activeQuery = array_filter([
        'filter' => $filter,
        'q' => $search,
        'marketing_id' => $selectedMarketingId,
        'web_id' => $selectedWebId,
    ], fn ($value) => filled($value));

    $money = fn ($value) => filled($value) ? 'Rp ' . number_format((int) $value, 0, ',', '.') : '-';

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

    $paymentState = function ($conversation) {
        $info = optional($conversation)->userInfo;
        $flag = fn ($value) => (int) $value === 1 ? 1 : 0;

        if (!$info) {
            return ['label' => 'Belum Lunas', 'class' => 'unpaid'];
        }

        $is50Paid = $flag($info->is_50_paid);
        $isPaid = $flag($info->is_paid);

        if ($isPaid === 1) {
            return ['label' => 'Lunas', 'class' => 'paid'];
        }

        if ($is50Paid === 1) {
            return ['label' => '50% Lunas', 'class' => 'half-paid'];
        }

        return ['label' => 'Belum Lunas', 'class' => 'unpaid'];
    };

    $periodState = function ($conversation) {
        return $conversation && $conversation->tanggal_pelunasan
            ? $conversation->tanggal_pelunasan->format('d/m/Y')
            : '-';
    };

    $revisionCode = function ($group) {
        $info = optional(optional($group)->conversation)->userInfo;

        if (!$info) {
            return ['label' => 'R0', 'helper' => 'Belum ada status'];
        }

        for ($level = 0; $level <= 3; $level++) {
            $column = 'is_rev_'.$level.'_done';
            if ((int) $info->{$column} !== 1) {
                return [
                    'label' => 'R'.$level,
                    'helper' => $level === 0 ? 'Website belum selesai' : 'Proses revisi '.$level,
                ];
            }
        }

        return ['label' => 'R3', 'helper' => 'Revisi 3 done'];
    };
?>

<?php $__env->startSection('content'); ?>
<section class="workspace-head">
    <h2>Manajemen Revisi Website</h2>
    <form class="search-form" method="GET" action="<?php echo e(route('revisions.index')); ?>">
        <input type="hidden" name="filter" value="<?php echo e($filter); ?>">
        <label>
            <span>Cari revisi</span>
            <input type="search" name="q" value="<?php echo e($search); ?>" placeholder="Cari domain, nama klien, atau tim">
        </label>
        <label>
            <span>Filter tim marketing</span>
            <select name="marketing_id" onchange="this.form.submit()">
                <option value="">Semua Marketing</option>
                <?php $__currentLoopData = $marketingUsers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $user): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <option value="<?php echo e($user->id); ?>" <?php if((int) $selectedMarketingId === (int) $user->id): echo 'selected'; endif; ?>><?php echo e($user->name); ?></option>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </select>
        </label>
        <label>
            <span>Filter tim web</span>
            <select name="web_id" onchange="this.form.submit()">
                <option value="">Semua Tim Web</option>
                <?php $__currentLoopData = $teamUsers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $user): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <option value="<?php echo e($user->id); ?>" <?php if((int) $selectedWebId === (int) $user->id): echo 'selected'; endif; ?>><?php echo e($user->name); ?></option>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </select>
        </label>
        <button class="primary-button icon-button search-button" type="submit" aria-label="Cari">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m16.5 16.5 4 4"></path></svg>
        </button>
    </form>
    <a class="primary-button add-button" href="<?php echo e(route('revisions.create')); ?>">Tambah Revisi Baru</a>
</section>

<section class="metric-grid" aria-label="Ringkasan revisi">
    <article class="metric-card">
        <span>Total Revisi</span>
        <strong><?php echo e(number_format($stats['total'])); ?></strong>
    </article>
    <article class="metric-card">
        <span>Belum Lunas</span>
        <strong><?php echo e(number_format($stats['unpaid'])); ?></strong>
    </article>
    <article class="metric-card">
        <span>Proses Revisi</span>
        <strong><?php echo e(number_format($stats['process_revision'])); ?></strong>
    </article>
    <article class="metric-card">
        <span>Revisi Selesai</span>
        <strong><?php echo e(number_format($stats['revision_done'])); ?></strong>
    </article>
</section>

<section class="revision-board">
    <div class="board-title">
        <h2>Daftar Revisi Aktif</h2>
    </div>

    <div class="filter-tabs" aria-label="Filter revisi">
        <?php $__currentLoopData = $filters; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <a class="<?php echo e($filter === $key ? 'is-selected' : ''); ?>" href="<?php echo e(route('revisions.index', array_merge($activeQuery, ['filter' => $key]))); ?>">
                <?php echo e($label); ?>

            </a>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </div>

    <div class="revision-table-wrap">
        <table class="revision-table">
            <thead>
                <tr>
                    <th>Domain Sementara</th>
                    <th>Nama Klien</th>
                    <th>Tim Marketing</th>
                    <th>Tim Web</th>
                    <th>Status Revisi</th>
                    <th>Sisa Pelunasan</th>
                    <th>Status Pembayaran</th>
                    <th>Periode Aktif</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php $__empty_1 = true; $__currentLoopData = $groups; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $group): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                    <?php
                        $conversation = $group->conversation;
                        $domain = $group->domain ?: optional($conversation)->domain ?: '-';
                        $detailRevision = $group->revisions->sortByDesc('jenis')->first();
                        $payment = $paymentState($conversation);
                        $revisionStatus = $revisionCode($group);
                    ?>

                    <tr>
                        <td class="domain-column">
                            <strong><?php echo e($domain); ?></strong>
                        </td>
                        <td><?php echo e(optional($conversation)->nama ?: '-'); ?></td>
                        <td><?php echo e(optional(optional($conversation)->marketing)->name ?: '-'); ?></td>
                        <td><?php echo e(optional(optional($conversation)->timWebsite)->name ?: '--'); ?></td>
                        <td>
                            <span class="revision-code"><?php echo e($revisionStatus['label']); ?></span>
                            <small><?php echo e($revisionStatus['helper']); ?></small>
                        </td>
                        <td><?php echo e($money($remainingPayment($conversation))); ?></td>
                        <td><span class="payment-pill <?php echo e($payment['class']); ?>"><?php echo e($payment['label']); ?></span></td>
                        <td><?php echo e($periodState($conversation)); ?></td>
                        <td>
                            <div class="action-buttons">
                                <?php if($detailRevision): ?>
                                    <a class="action-button detail" href="<?php echo e(route('revisions.edit', $detailRevision->id)); ?>" aria-label="Detail revisi <?php echo e($domain); ?>" title="Detail">
                                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z"></path></svg>
                                    </a>
                                <?php else: ?>
                                    <span class="action-button detail is-disabled" aria-label="Detail tidak tersedia">
                                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z"></path></svg>
                                    </span>
                                <?php endif; ?>
                                <form method="POST" action="<?php echo e(route('revision-groups.destroy', $group)); ?>" data-confirm-delete>
                                    <?php echo csrf_field(); ?>
                                    <?php echo method_field('DELETE'); ?>
                                    <button class="action-button delete" type="submit" aria-label="Hapus revisi <?php echo e($domain); ?>" title="Hapus">
                                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                    <tr>
                        <td colspan="9" class="empty-state">Tidak ada revisi yang cocok dengan filter.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>

    <div class="pagination-wrap">
        <?php echo e($groups->onEachSide(1)->links('pagination.revision')); ?>

    </div>
</section>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.app', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH D:\UI Revisi Web\revision-website-aravel\resources\views/revisions/index.blade.php ENDPATH**/ ?>