<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RevisionSeeder extends Seeder
{
    public function run()
    {
        DB::table('revisions')->insert([
            [
                'title' => 'Initial Revision',
                'content' => 'This is the content of the initial revision.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Second Revision',
                'content' => 'This is the content of the second revision.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Third Revision',
                'content' => 'This is the content of the third revision.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}