<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RevisionController;

Route::middleware('api')->group(function () {
    Route::get('/revisions', [RevisionController::class, 'index']);
    Route::get('/revisions/{id}', [RevisionController::class, 'edit']);
    Route::put('/revisions/{id}', [RevisionController::class, 'update']);
});