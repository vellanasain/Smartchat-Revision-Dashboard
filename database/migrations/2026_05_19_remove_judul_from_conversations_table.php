<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class RemoveJudulFromConversationsTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('conversations')) {
            Schema::table('conversations', function (Blueprint $table) {
                if (Schema::hasColumn('conversations', 'judul')) {
                    $table->dropColumn('judul');
                }
                if (Schema::hasColumn('conversations', 'judul_admin')) {
                    $table->dropColumn('judul_admin');
                }
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('conversations')) {
            Schema::table('conversations', function (Blueprint $table) {
                if (!Schema::hasColumn('conversations', 'judul')) {
                    $table->string('judul')->nullable()->after('id');
                }
                if (!Schema::hasColumn('conversations', 'judul_admin')) {
                    $table->string('judul_admin')->nullable()->after('judul');
                }
            });
        }
    }
}
