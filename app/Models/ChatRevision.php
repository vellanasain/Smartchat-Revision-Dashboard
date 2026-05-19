<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatRevision extends Model
{
    protected $fillable = [
        'role',
        'content',
        'reply_context',
        'revision_id',
        'reply_context_role',
        'type',
        'caption',
    ];
}
