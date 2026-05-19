<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Revision;
use App\Models\RevisionGroup;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class RevisionController extends Controller
{
    private array $marketingNames = [
        'Ayu',
        'Iin',
        'Ikmah',
        'Aulia',
        'Zaqia',
        'Bella',
        'Reni',
        'Sevya',
        'Wiwin',
        'Tika',
        'Ingka',
        'Cindi',
        'Chatbot',
        'Dea',
        'Ika',
        'Sekar',
        'Okti',
        'Neneng',
        'Vika',
        'EbyB',
        'Ifah',
        'Yesi',
        'Andini',
        'Yovanti',
        'Imelia',
        'Zalfa',
    ];

    public function index(Request $request)
    {
        $search = trim((string) $request->query('q', ''));
        $filter = $request->query('filter', 'all');
        $marketingFilter = $request->query('marketing_id');
        $webFilter = $request->query('web_id');
        $selectedMarketingId = filled($marketingFilter) && ctype_digit((string) $marketingFilter) ? (int) $marketingFilter : null;
        $selectedWebId = filled($webFilter) && ctype_digit((string) $webFilter) ? (int) $webFilter : null;

        $query = RevisionGroup::query()
            ->with([
                'conversation:id,judul,nama,domain,source,user_id,tim_design_id,sisa_pelunasan,is_automate_pelunasan,tanggal_pelunasan,is_lunas,is_check_lunas,notes',
                'conversation.marketing:id,name,role',
                'conversation.timWebsite:id,name,role',
                'conversation.userInfo:id,conversation_id,is_50_paid,is_paid,is_rev_0_done,is_rev_1_done,is_rev_2_done,is_rev_3_done',
                'revisions:id,revision_group_id,conversation_id,deskripsi,jenis,status,is_answered,is_collecting,response_date,created_at',
            ])
            ->withCount('revisions')
            ->latest('updated_at');

        if ($search !== '') {
            collect(preg_split('/\s+/', mb_strtolower($search), -1, PREG_SPLIT_NO_EMPTY))
                ->unique()
                ->each(fn ($term) => $this->applySearchTerm($query, $term));
        }

        if ($selectedMarketingId) {
            $query->whereHas('conversation', fn ($conversation) => $conversation->where('user_id', $selectedMarketingId));
        }

        if ($selectedWebId) {
            $query->whereHas('conversation', fn ($conversation) => $conversation->where('tim_design_id', $selectedWebId));
        }

        if ($filter === 'process_revision') {
            $query->whereHas('revisions', fn ($revision) => $revision->where('jenis', '>', 0)->where('is_answered', 0));
        } elseif ($filter === 'unpaid') {
            $query->whereHas('conversation.userInfo', fn ($info) => $info
                ->where(fn ($builder) => $builder->where('is_50_paid', 0)->orWhereNull('is_50_paid'))
                ->where(fn ($builder) => $builder->where('is_paid', 0)->orWhereNull('is_paid')));
        } elseif ($filter === 'revision_done') {
            $query->whereHas('conversation.userInfo', fn ($info) => $info->where(function ($builder) {
                $builder->where('is_rev_1_done', 1)
                    ->orWhere('is_rev_2_done', 1)
                    ->orWhere('is_rev_3_done', 1);
            }));
        }

        $groups = $query->paginate(12)->withQueryString();

        $stats = [
            'total' => RevisionGroup::count(),
            'unpaid' => RevisionGroup::whereHas('conversation.userInfo', fn ($info) => $info
                ->where(fn ($builder) => $builder->where('is_50_paid', 0)->orWhereNull('is_50_paid'))
                ->where(fn ($builder) => $builder->where('is_paid', 0)->orWhereNull('is_paid')))->count(),
            'process_revision' => Revision::where('jenis', '>', 0)->where('is_answered', 0)->distinct('revision_group_id')->count('revision_group_id'),
            'revision_done' => RevisionGroup::whereHas('conversation.userInfo', fn ($info) => $info->where(function ($builder) {
                $builder->where('is_rev_1_done', 1)
                    ->orWhere('is_rev_2_done', 1)
                    ->orWhere('is_rev_3_done', 1);
            }))->count(),
        ];
        $teamUsers = User::where('role', 'website')->orderBy('name')->get(['id', 'name']);
        $marketingUsers = User::query()
            ->whereIn('id', Conversation::query()
                ->select('user_id')
                ->whereNotNull('user_id')
                ->whereIn('id', RevisionGroup::query()->select('conversation_id')->whereNotNull('conversation_id')))
            ->orderBy('name')
            ->get(['id', 'name']);

        return view('revisions.index', compact(
            'groups',
            'stats',
            'search',
            'filter',
            'teamUsers',
            'marketingUsers',
            'selectedMarketingId',
            'selectedWebId'
        ));
    }

    private function applySearchTerm($query, string $term): void
    {
        $like = '%'.$this->escapeLike($term).'%';

        $query->where(function ($builder) use ($like) {
            $builder->whereRaw('LOWER(revision_groups.domain) LIKE ? ESCAPE "\\\\"', [$like])
                ->orWhereHas('conversation', function ($conversation) use ($like) {
                    $conversation->whereRaw('LOWER(judul) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereRaw('LOWER(nama) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereRaw('LOWER(domain) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereRaw('LOWER(source) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereRaw('LOWER(notes) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereHas('marketing', function ($user) use ($like) {
                            $user->whereRaw('LOWER(name) LIKE ? ESCAPE "\\\\"', [$like]);
                        })
                        ->orWhereHas('timWebsite', function ($user) use ($like) {
                            $user->whereRaw('LOWER(name) LIKE ? ESCAPE "\\\\"', [$like]);
                        });
                })
                ->orWhereHas('revisions', function ($revision) use ($like) {
                    $revision->whereRaw('LOWER(deskripsi) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereRaw('LOWER(notes) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereRaw('LOWER(response) LIKE ? ESCAPE "\\\\"', [$like]);
                });
        });
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    public function create()
    {
        $teamUsers = User::where('role', 'website')->orderBy('name')->get(['id', 'name']);
        $marketingUsers = User::query()
            ->whereIn(DB::raw('LOWER(name)'), array_map('strtolower', $this->marketingNames))
            ->get(['id', 'name'])
            ->sortBy(fn ($user) => array_search(strtolower($user->name), array_map('strtolower', $this->marketingNames)))
            ->values();
        $clients = Conversation::query()
            ->whereNotNull('nama')
            ->where('nama', '<>', '')
            ->whereIn('user_id', $marketingUsers->pluck('id'))
            ->select('user_id', 'nama')
            ->distinct()
            ->orderBy('nama')
            ->get();

        return view('revisions.create', compact('teamUsers', 'marketingUsers', 'clients'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'domain' => 'required|string|max:100',
            'nama' => 'nullable|string|max:100',
            'user_id' => 'required|integer|exists:users,id',
            'tim_design_id' => 'nullable|integer|exists:users,id',
            'sisa_pelunasan' => 'nullable|integer|min:0',
        ]);

        DB::transaction(function () use ($data) {
            $conversation = Conversation::create([
                'judul' => substr(md5($data['domain'].microtime(true)), 0, 8),
                'domain' => $data['domain'],
                'nama' => $data['nama'] ?? null,
                'user_id' => $data['user_id'],
                'tim_design_id' => $data['tim_design_id'] ?? null,
                'source' => 'Website Channel',
                'company_id' => 1,
                'sisa_pelunasan' => $data['sisa_pelunasan'] ?? null,
            ]);

            $group = RevisionGroup::create([
                'conversation_id' => $conversation->id,
                'domain' => $data['domain'],
                'active_revision' => 0,
                'status' => 1,
            ]);

            Revision::create([
                'conversation_id' => $conversation->id,
                'revision_group_id' => $group->id,
                'deskripsi' => 'Menunggu Website Jadi',
                'jenis' => 0,
                'status' => 0,
                'is_answered' => 2,
            ]);
        });

        return redirect()->route('revisions.index')->with('success', 'Revisi baru berhasil ditambahkan.');
    }

    public function updateTeam(Request $request, RevisionGroup $group)
    {
        $data = $request->validate([
            'tim_design_id' => 'nullable|integer|exists:users,id',
        ]);

        $group->conversation?->update([
            'tim_design_id' => $data['tim_design_id'] ?? null,
        ]);

        return redirect()->route('revisions.index', $request->only(['q', 'filter', 'marketing_id', 'web_id']))->with('success', 'Tim web berhasil diperbarui.');
    }

    public function destroyGroup(RevisionGroup $group)
    {
        DB::transaction(function () use ($group) {
            $revisionIds = $group->revisions()->pluck('id');
            DB::table('chat_revisions')->whereIn('revision_id', $revisionIds)->delete();
            Revision::whereIn('id', $revisionIds)->delete();
            $group->delete();
        });

        return redirect()->route('revisions.index')->with('success', 'Data revisi berhasil dihapus.');
    }

    public function edit($id)
    {
        $revision = Revision::with([
            'conversation:id,judul,nama,domain,source,user_id,tim_design_id,sisa_pelunasan,is_automate_pelunasan,tanggal_pelunasan,is_lunas,is_check_lunas,notes',
            'conversation.marketing:id,name,role',
            'conversation.timWebsite:id,name,role',
            'conversation.userInfo:id,conversation_id,is_50_paid,is_paid,is_rev_0_done,is_rev_1_done,is_rev_2_done,is_rev_3_done,package,monthly_bill,domain',
            'group:id,domain,active_revision,status,conversation_id',
            'group.revisions:id,revision_group_id,conversation_id,deskripsi,jenis,status,is_answered,is_collecting,response,notes,created_at',
            'chats' => fn ($query) => $query->oldest('created_at'),
        ])->findOrFail($id);

        return view('revisions.edit', compact('revision'));
    }

    public function update(Request $request, $id)
    {
        $revision = Revision::with(['group.revisions', 'conversation'])->findOrFail($id);

        $data = $request->validate([
            'stages' => 'array',
            'stages.*' => 'nullable|in:,waiting_client_data,ready_to_revision',
            'work_statuses' => 'array',
            'work_statuses.*' => 'nullable|in:,not_started,on_process,done',
            'revision_notes' => 'array',
            'revision_notes.*' => 'nullable|string',
            'project_notes.package_website' => 'nullable|string|max:255',
            'project_notes.biaya' => 'nullable|string|max:255',
            'project_notes.domain_resmi' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($revision, $data) {
            $group = $revision->group;
            $conversation = $revision->conversation;

            for ($jenis = 0; $jenis <= 3; $jenis++) {
                $row = $group->revisions->firstWhere('jenis', $jenis);
                $workStatus = $data['work_statuses'][$jenis] ?: 'not_started';

                $payload = [
                    'conversation_id' => $conversation->id,
                    'revision_group_id' => $group->id,
                    'jenis' => $jenis,
                    'deskripsi' => $jenis === 0 ? 'Website Sudah Jadi' : 'Revisi Tahap '.$jenis,
                    'response' => $data['stages'][$jenis] ?? null,
                    'notes' => $data['revision_notes'][$jenis] ?? null,
                    'status' => 1,
                    'is_collecting' => $workStatus === 'on_process' ? 1 : 0,
                    'is_answered' => $workStatus === 'done' ? 1 : 0,
                ];

                if ($row) {
                    $row->update($payload);
                } else {
                    Revision::create($payload);
                }
            }

            $projectNotes = $data['project_notes'] ?? [];
            $notesText = collect([
                'Paket Website' => $projectNotes['package_website'] ?? null,
                'Biaya' => $projectNotes['biaya'] ?? null,
                'Domain Resmi' => $projectNotes['domain_resmi'] ?? null,
            ])
                ->filter(fn ($value) => filled($value))
                ->map(fn ($value, $key) => $key.': '.$value)
                ->implode(PHP_EOL);

            $conversation->update([
                'notes' => $notesText ?: null,
            ]);
        });

        return redirect()->route('revisions.edit', $revision->id)->with('success', 'Detail revisi berhasil diperbarui.');
    }
}
