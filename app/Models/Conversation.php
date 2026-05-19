<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = [
        'judul',
        'judul_admin',
        'nama',
        'domain',
        'source',
        'notes',
        'user_id',
        'company_id',
        'tim_design_id',
        'end_session',
        'session_status',
        'sisa_pelunasan',
        'tanggal_pelunasan',
        'is_lunas',
        'is_check_lunas',
    ];

    protected $casts = [
        'end_session' => 'datetime',
        'session_status' => 'integer',
        'tanggal_pelunasan' => 'date',
        'sisa_pelunasan' => 'integer',
        'is_lunas' => 'integer',
        'is_check_lunas' => 'integer',
    ];

    public function timWebsite()
    {
        return $this->belongsTo(User::class, 'tim_design_id');
    }

    public function marketing()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function userInfo()
    {
        return $this->hasOne(UserInfo::class);
    }
}
