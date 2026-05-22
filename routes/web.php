<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DebugController;
use App\Http\Controllers\RevisionController;

Route::redirect('/', '/revisions');
Route::get('/debug/logs', [DebugController::class, 'logs'])->name('debug.logs');
Route::get('/revisions', [RevisionController::class, 'index'])->name('revisions.index');
Route::get('/revisions/create', [RevisionController::class, 'create'])->name('revisions.create');
Route::post('/revisions', [RevisionController::class, 'store'])->name('revisions.store');
Route::patch('/revision-groups/{group}/team', [RevisionController::class, 'updateTeam'])->name('revision-groups.team');
Route::delete('/revision-groups/{group}', [RevisionController::class, 'destroyGroup'])->name('revision-groups.destroy');
Route::get('/revisions/{id}/edit', [RevisionController::class, 'edit'])->name('revisions.edit');
Route::put('/revisions/{id}', [RevisionController::class, 'update'])->name('revisions.update');
