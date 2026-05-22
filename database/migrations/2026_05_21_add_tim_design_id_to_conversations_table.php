<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddTimDesignIdToConversationsTable extends Migration
{
    public function up()
    {
        if (Schema::hasTable('conversations') && !Schema::hasColumn('conversations', 'tim_design_id')) {
            Schema::table('conversations', function (Blueprint $table) {
                $table->unsignedBigInteger('tim_design_id')->nullable()->after('user_id');
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('conversations') && Schema::hasColumn('conversations', 'tim_design_id')) {
            Schema::table('conversations', function (Blueprint $table) {
                $table->dropColumn('tim_design_id');
            });
        }
    }
}
