<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserInfo extends Model
{
    protected $table = 'user_infos';

    protected $casts = [
        'is_50_paid' => 'integer',
        'is_paid' => 'integer',
        'is_rev_0_done' => 'integer',
        'is_rev_1_done' => 'integer',
        'is_rev_2_done' => 'integer',
        'is_rev_3_done' => 'integer',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }
}
