<?php if($paginator->hasPages()): ?>
    <nav class="clean-pagination" role="navigation" aria-label="Pagination">
        <p class="pagination-summary">
            Showing <?php echo e($paginator->firstItem()); ?> to <?php echo e($paginator->lastItem()); ?> of <?php echo e($paginator->total()); ?> results
        </p>

        <ul class="pagination">
            <li class="page-item <?php echo e($paginator->onFirstPage() ? 'disabled' : ''); ?>">
                <?php if($paginator->onFirstPage()): ?>
                    <span class="page-link" aria-hidden="true">&lsaquo;</span>
                <?php else: ?>
                    <a class="page-link" href="<?php echo e($paginator->previousPageUrl()); ?>" rel="prev" aria-label="Halaman sebelumnya">&lsaquo;</a>
                <?php endif; ?>
            </li>

            <?php $__currentLoopData = $elements; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $element): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <?php if(is_string($element)): ?>
                    <li class="page-item disabled"><span class="page-link"><?php echo e($element); ?></span></li>
                <?php endif; ?>

                <?php if(is_array($element)): ?>
                    <?php $__currentLoopData = $element; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $page => $url): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <li class="page-item <?php echo e($page == $paginator->currentPage() ? 'active' : ''); ?>">
                            <?php if($page == $paginator->currentPage()): ?>
                                <span class="page-link"><?php echo e($page); ?></span>
                            <?php else: ?>
                                <a class="page-link" href="<?php echo e($url); ?>"><?php echo e($page); ?></a>
                            <?php endif; ?>
                        </li>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                <?php endif; ?>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

            <li class="page-item <?php echo e($paginator->hasMorePages() ? '' : 'disabled'); ?>">
                <?php if($paginator->hasMorePages()): ?>
                    <a class="page-link" href="<?php echo e($paginator->nextPageUrl()); ?>" rel="next" aria-label="Halaman berikutnya">&rsaquo;</a>
                <?php else: ?>
                    <span class="page-link" aria-hidden="true">&rsaquo;</span>
                <?php endif; ?>
            </li>
        </ul>
    </nav>
<?php endif; ?>
<?php /**PATH D:\UI Revisi Web\revision-website-aravel\resources\views/pagination/revision.blade.php ENDPATH**/ ?>