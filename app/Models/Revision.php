<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Revision extends Model
{
    use HasFactory;

    protected $table = 'revisions';

    protected $fillable = [
        'deskripsi',
        'is_answered',
        'response',
        'response_date',
        'conversation_id',
        'notes',
        'jenis',
        'status',
        'revision_group_id',
        'is_collecting',
    ];

    protected $casts = [
        'is_answered' => 'boolean',
        'is_collecting' => 'boolean',
        'status' => 'integer',
        'response_date' => 'date',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function group()
    {
        return $this->belongsTo(RevisionGroup::class, 'revision_group_id');
    }

    public function chats()
    {
        return $this->hasMany(ChatRevision::class);
    }
}
