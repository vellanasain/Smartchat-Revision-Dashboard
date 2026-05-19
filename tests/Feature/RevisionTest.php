<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Revision;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RevisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_view_revisions_index()
    {
        $response = $this->get('/revisions');

        $response->assertStatus(200);
        $response->assertViewIs('revisions.index');
    }

    public function test_can_view_revision_edit_page()
    {
        $revision = Revision::factory()->create();

        $response = $this->get("/revisions/{$revision->id}/edit");

        $response->assertStatus(200);
        $response->assertViewIs('revisions.edit');
    }

    public function test_can_update_revision()
    {
        $revision = Revision::factory()->create();

        $response = $this->put("/revisions/{$revision->id}", [
            'title' => 'Updated Title',
            'content' => 'Updated content for the revision.',
        ]);

        $response->assertRedirect("/revisions/{$revision->id}/edit");
        $this->assertDatabaseHas('revisions', [
            'id' => $revision->id,
            'title' => 'Updated Title',
            'content' => 'Updated content for the revision.',
        ]);
    }

    public function test_can_create_revision()
    {
        $response = $this->post('/revisions', [
            'title' => 'New Revision',
            'content' => 'Content for the new revision.',
        ]);

        $response->assertRedirect('/revisions');
        $this->assertDatabaseHas('revisions', [
            'title' => 'New Revision',
            'content' => 'Content for the new revision.',
        ]);
    }
}