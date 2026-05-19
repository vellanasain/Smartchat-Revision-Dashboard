<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RevisionRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'deskripsi' => 'nullable|string',
            'response' => 'nullable|string',
            'notes' => 'nullable|string',
            'response_date' => 'nullable|date',
            'status' => 'required|in:0,1',
            'is_answered' => 'nullable|boolean',
            'is_collecting' => 'nullable|boolean',
        ];
    }

    public function messages()
    {
        return [
            'status.required' => 'Status revisi wajib dipilih.',
            'status.in' => 'Status revisi tidak valid.',
        ];
    }
}
