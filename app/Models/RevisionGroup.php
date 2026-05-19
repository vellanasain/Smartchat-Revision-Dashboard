<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RevisionGroup extends Model
{
    protected $fillable = [
        'conversation_id',
        'domain',
        'active_revision',
        'status',
    ];

    protected $casts = [
        'active_revision' => 'integer',
        'status' => 'integer',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function revisions()
    {
        return $this->hasMany(Revision::class)->orderBy('jenis')->orderBy('created_at');
    }
}
